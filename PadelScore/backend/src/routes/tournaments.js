const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/tournaments - Get all tournaments
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT t.*,
             u.first_name as creator_first_name, u.last_name as creator_last_name,
             COUNT(m.id) as total_matches
      FROM tournaments t
      LEFT JOIN users u ON t.created_by = u.id
      LEFT JOIN matches m ON t.id = m.tournament_id
      GROUP BY t.id, u.first_name, u.last_name
      ORDER BY t.start_date DESC
    `);

    res.json({
      tournaments: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tournaments/:id - Get single tournament with matches
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get tournament details
    const tournamentResult = await pool.query(
      'SELECT * FROM tournaments WHERE id = $1',
      [id]
    );

    if (tournamentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get tournament matches
    const matchesResult = await pool.query(`
      SELECT m.*,
             t1.name as team1_name, t2.name as team2_name,
             u.first_name as referee_first_name, u.last_name as referee_last_name
      FROM matches m
      JOIN teams t1 ON m.team1_id = t1.id
      JOIN teams t2 ON m.team2_id = t2.id
      LEFT JOIN users u ON m.referee_id = u.id
      WHERE m.tournament_id = $1
      ORDER BY m.scheduled_at
    `, [id]);

    res.json({
      tournament: {
        ...tournamentResult.rows[0],
        matches: matchesResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tournaments - Create new tournament (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const {
      name,
      description,
      start_date,
      end_date,
      max_teams,
      entry_fee,
      prize_pool
    } = req.body;

    if (!name || !start_date) {
      return res.status(400).json({ error: 'Tournament name and start date are required' });
    }

    const result = await pool.query(
      `INSERT INTO tournaments (name, description, start_date, end_date, max_teams, entry_fee, prize_pool, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, description, start_date, end_date, max_teams, entry_fee, prize_pool, req.user.id]
    );

    res.status(201).json({
      message: 'Tournament created successfully',
      tournament: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tournaments/:id - Update tournament (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      start_date,
      end_date,
      status,
      max_teams,
      entry_fee,
      prize_pool
    } = req.body;

    const result = await pool.query(
      `UPDATE tournaments 
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           start_date = COALESCE($4, start_date),
           end_date = COALESCE($5, end_date),
           status = COALESCE($6, status),
           max_teams = COALESCE($7, max_teams),
           entry_fee = COALESCE($8, entry_fee),
           prize_pool = COALESCE($9, prize_pool),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, name, description, start_date, end_date, status, max_teams, entry_fee, prize_pool]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    res.json({
      message: 'Tournament updated successfully',
      tournament: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/leaderboard/:tournamentId - Get tournament leaderboard
router.get('/:tournamentId/leaderboard', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    const result = await pool.query(`
      SELECT t.id, t.name, t.ranking,
             COUNT(m.id) as matches_played,
             SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END) as wins,
             COUNT(m.id) - SUM(CASE WHEN m.winner_id = t.id THEN 1 ELSE 0 END) as losses,
             SUM(CASE WHEN m.winner_id = t.id THEN 3 ELSE 0 END) as points
      FROM teams t
      JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id)
      WHERE m.tournament_id = $1 AND m.status = 'completed'
      GROUP BY t.id, t.name, t.ranking
      ORDER BY points DESC, wins DESC, t.ranking DESC
    `, [tournamentId]);

    res.json({
      leaderboard: result.rows,
      tournament_id: tournamentId
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;