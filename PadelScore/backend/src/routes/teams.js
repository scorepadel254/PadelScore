const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/teams - Get all teams with player details
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.id, t.name, t.ranking, t.wins, t.losses, t.created_at,
             p1.first_name as player1_first_name, p1.last_name as player1_last_name,
             p2.first_name as player2_first_name, p2.last_name as player2_last_name,
             t.player1_id, t.player2_id
      FROM teams t
      JOIN players p1 ON t.player1_id = p1.id
      JOIN players p2 ON t.player2_id = p2.id
      ORDER BY t.ranking DESC
    `);

    const teams = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      ranking: row.ranking,
      wins: row.wins,
      losses: row.losses,
      created_at: row.created_at,
      players: [
        {
          id: row.player1_id,
          first_name: row.player1_first_name,
          last_name: row.player1_last_name
        },
        {
          id: row.player2_id,
          first_name: row.player2_first_name,
          last_name: row.player2_last_name
        }
      ]
    }));

    res.json({
      teams,
      total: teams.length
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teams/:id - Get single team
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT t.*, 
             p1.first_name as player1_first_name, p1.last_name as player1_last_name,
             p2.first_name as player2_first_name, p2.last_name as player2_last_name
      FROM teams t
      JOIN players p1 ON t.player1_id = p1.id
      JOIN players p2 ON t.player2_id = p2.id
      WHERE t.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const team = result.rows[0];
    res.json({
      team: {
        ...team,
        players: [
          {
            id: team.player1_id,
            first_name: team.player1_first_name,
            last_name: team.player1_last_name
          },
          {
            id: team.player2_id,
            first_name: team.player2_first_name,
            last_name: team.player2_last_name
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/teams - Create new team (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, player1_id, player2_id, ranking = 1000 } = req.body;

    if (!name || !player1_id || !player2_id) {
      return res.status(400).json({ error: 'Team name and both player IDs are required' });
    }

    if (player1_id === player2_id) {
      return res.status(400).json({ error: 'A team cannot have the same player twice' });
    }

    // Check if players exist
    const playersResult = await pool.query(
      'SELECT id FROM players WHERE id IN ($1, $2)',
      [player1_id, player2_id]
    );

    if (playersResult.rows.length !== 2) {
      return res.status(400).json({ error: 'One or both players not found' });
    }

    const result = await pool.query(
      `INSERT INTO teams (name, player1_id, player2_id, ranking)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, player1_id, player2_id, ranking]
    );

    res.status(201).json({
      message: 'Team created successfully',
      team: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/teams/:id - Update team (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ranking, wins, losses } = req.body;

    const result = await pool.query(
      `UPDATE teams 
       SET name = COALESCE($2, name),
           ranking = COALESCE($3, ranking),
           wins = COALESCE($4, wins),
           losses = COALESCE($5, losses),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, name, ranking, wins, losses]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({
      message: 'Team updated successfully',
      team: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/teams/:id - Delete team (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM teams WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;