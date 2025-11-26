// API Route per gestire un singolo progetto su Vercel
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const connectionString = process.env.DATABASE_URL;
const sql = neon(connectionString);

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verifica autenticazione
  const auth = await authenticateToken(req);
  if (auth.error) {
    return res.status(auth.status).json({ success: false, message: auth.error });
  }
  const user = auth.user;

  const { projectId } = req.query;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: 'ID progetto è obbligatorio'
    });
  }

  try {
    // GET - Ottieni un singolo progetto
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
        WHERE id = ${projectId} AND user_id = ${user.user_id}
      `;
      
      if (projects.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Progetto non trovato'
        });
      }
      
      const project = projects[0];
      return res.json({
        success: true,
        project: {
          id: project.id,
          name: project.name,
          description: project.description || '',
          color: project.color,
          icon: project.icon,
          createdAt: project.created_at,
          updatedAt: project.updated_at
        }
      });
    }

    // PATCH - Aggiorna un progetto
    if (req.method === 'PATCH') {
      const { name, description, color, icon } = req.body;
      
      // Verifica che il progetto esista e appartenga all'utente
      const existingProject = await sql`
        SELECT id FROM projects WHERE id = ${projectId} AND user_id = ${user.user_id}
      `;
      
      if (existingProject.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Progetto non trovato'
        });
      }
      
      // Costruisci la query di aggiornamento
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
        WHERE id = ${projectId} AND user_id = ${user.user_id}
      `;
      
      // Recupera il progetto aggiornato
      const updatedProject = await sql`
        SELECT id, name, description, color, icon, created_at, updated_at
        FROM projects
        WHERE id = ${projectId} AND user_id = ${user.user_id}
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
      // Verifica che il progetto esista e appartenga all'utente
      const existingProject = await sql`
        SELECT id FROM projects WHERE id = ${projectId} AND user_id = ${user.user_id}
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
        WHERE project_id = ${projectId} AND user_id = ${user.user_id}
      `;
      
      // Elimina il progetto
      await sql`
        DELETE FROM projects 
        WHERE id = ${projectId} AND user_id = ${user.user_id}
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

