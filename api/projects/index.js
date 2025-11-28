// API Route per gestire i progetti su Vercel
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);

// Flag per evitare creazioni multiple simultanee
let isInitializing = false;
let isInitialized = false;

// Funzione per inizializzare automaticamente le tabelle
async function ensureTablesExist() {
  if (isInitialized) return true;
  if (isInitializing) {
    // Aspetta che l'inizializzazione finisca
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return isInitialized;
  }
  
  isInitializing = true;
  
  try {
    // Verifica se la tabella projects esiste
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
      )
    `;
    
    if (!tableCheck[0].exists) {
      console.log('🔧 [PROJECTS API] Creazione tabelle database...');
      
      // Crea tabella projects
      await sql`
        CREATE TABLE IF NOT EXISTS projects (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          color VARCHAR(50),
          icon VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      // Crea indici
      await sql`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`;
      
      // Crea funzione e trigger per updated_at
      await sql`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql'
      `;
      
      await sql`DROP TRIGGER IF EXISTS update_projects_updated_at ON projects`;
      await sql`
        CREATE TRIGGER update_projects_updated_at 
        BEFORE UPDATE ON projects
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
      `;
      
      console.log('✅ [PROJECTS API] Tabelle create con successo');
    }
    
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('❌ [PROJECTS API] Errore creazione tabelle:', error);
    isInitializing = false;
    return false;
  } finally {
    isInitializing = false;
  }
}

// Middleware per verificare autenticazione
async function authenticateToken(req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return { error: 'Token non fornito', status: 401 };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const sessions = await sql`
      SELECT s.*, u.id as user_id, u.email, u.username, u.is_active
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token = ${token}
        AND s.expires_at > NOW()
        AND u.is_active = true
    `;
    
    if (sessions.length === 0) {
      return { error: 'Sessione non valida', status: 401 };
    }
    
    return { user: sessions[0] };
  } catch (error) {
    return { error: 'Token non valido', status: 403 };
  }
}

export default async function handler(req, res) {
  // Abilita CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Assicurati che le tabelle esistano (automatico)
  const tablesReady = await ensureTablesExist();
  if (!tablesReady) {
    return res.status(500).json({
      success: false,
      message: 'Errore inizializzazione database'
    });
  }

  // Verifica autenticazione
  const auth = await authenticateToken(req);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, message: auth.error });
  }
  const user = auth.user;

  try {
    // GET - Ottieni tutti i progetti dell'utente
    if (req.method === 'GET') {
      const projects = await sql`
        SELECT 
          id,
          name,
          description,
          color,
          icon,
          created_at,
          updated_at
        FROM projects
        WHERE user_id = ${user.user_id}
        ORDER BY updated_at DESC
      `;
      
      const formattedProjects = projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description || '',
        color: project.color,
        icon: project.icon,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }));
      
      return res.json({
        success: true,
        projects: formattedProjects
      });
    }

    // POST - Crea un nuovo progetto
    if (req.method === 'POST') {
      let { id, name, description, color, icon } = req.body;
      
      if (!id || !name) {
        return res.status(400).json({
          success: false,
          message: 'ID e nome sono obbligatori'
        });
      }
      
      // Tronca l'icon a 100 caratteri per rispettare il limite del database
      if (icon && icon.length > 100) {
        icon = icon.substring(0, 100);
      }
      
      // Verifica se il progetto esiste già
      const existingProject = await sql`
        SELECT id FROM projects WHERE id = ${id} AND user_id = ${user.user_id}
      `;
      
      if (existingProject.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Progetto già esistente'
        });
      }
      
      // Crea il nuovo progetto
      await sql`
        INSERT INTO projects (id, user_id, name, description, color, icon, created_at, updated_at)
        VALUES (${id}, ${user.user_id}, ${name}, ${description || null}, ${color || null}, ${icon || null}, NOW(), NOW())
      `;
      
      return res.json({
        success: true,
        message: 'Progetto creato con successo',
        project: {
          id,
          name,
          description: description || '',
          color: color || null,
          icon: icon || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }

    // PATCH - Aggiorna un progetto esistente
    if (req.method === 'PATCH') {
      let { id, name, description, color, icon } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID progetto è obbligatorio'
        });
      }
      
      // Tronca l'icon a 100 caratteri per rispettare il limite del database
      if (icon !== undefined && icon !== null && icon.length > 100) {
        icon = icon.substring(0, 100);
      }
      
      // Verifica che il progetto esista e appartenga all'utente
      const existingProject = await sql`
        SELECT id FROM projects WHERE id = ${id} AND user_id = ${user.user_id}
      `;
      
      if (existingProject.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Progetto non trovato'
        });
      }
      
      // Costruisci la query di aggiornamento dinamicamente
      const updateFields = [];
      
      if (name !== undefined) {
        updateFields.push(sql`name = ${name}`);
      }
      if (description !== undefined) {
        updateFields.push(sql`description = ${description}`);
      }
      if (color !== undefined) {
        updateFields.push(sql`color = ${color}`);
      }
      if (icon !== undefined) {
        updateFields.push(sql`icon = ${icon}`);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nessun campo da aggiornare'
        });
      }
      
      // Aggiorna il progetto
      const updateClause = sql.join(updateFields, sql`, `);
      await sql`
        UPDATE projects 
        SET ${updateClause}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${user.user_id}
      `;
      
      // Recupera il progetto aggiornato
      const updatedProject = await sql`
        SELECT id, name, description, color, icon, created_at, updated_at
        FROM projects
        WHERE id = ${id} AND user_id = ${user.user_id}
      `;
      
      return res.json({
        success: true,
        message: 'Progetto aggiornato con successo',
        project: {
          id: updatedProject[0].id,
          name: updatedProject[0].name,
          description: updatedProject[0].description || '',
          color: updatedProject[0].color,
          icon: updatedProject[0].icon,
          createdAt: updatedProject[0].created_at,
          updatedAt: updatedProject[0].updated_at
        }
      });
    }

    // DELETE - Elimina un progetto
    if (req.method === 'DELETE') {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID progetto è obbligatorio'
        });
      }
      
      // Verifica che il progetto esista e appartenga all'utente
      const existingProject = await sql`
        SELECT id FROM projects WHERE id = ${id} AND user_id = ${user.user_id}
      `;
      
      if (existingProject.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Progetto non trovato'
        });
      }
      
      // Rimuovi project_id dalle chat associate (imposta a null)
      await sql`
        UPDATE chats 
        SET project_id = NULL 
        WHERE project_id = ${id} AND user_id = ${user.user_id}
      `;
      
      // Elimina il progetto
      await sql`
        DELETE FROM projects 
        WHERE id = ${id} AND user_id = ${user.user_id}
      `;
      
      return res.json({
        success: true,
        message: 'Progetto eliminato con successo'
      });
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('❌ [PROJECTS API] Errore:', error);
    return res.status(500).json({
      success: false,
      message: 'Errore nel server',
      error: error.message
    });
  }
}

