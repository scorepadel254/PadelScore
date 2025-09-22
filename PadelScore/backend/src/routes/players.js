const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/players - Get all players
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, first_name, last_name, email, phone, ranking, wins, losses,
             created_at, updated_at
      FROM players
      ORDER BY ranking DESC
    `);

    res.json({
      players: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/players/:id - Get single player
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM players WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({ player: result.rows[0] });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/players - Create new player (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { first_name, last_name, email, phone, ranking = 1000 } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const result = await pool.query(
      `INSERT INTO players (first_name, last_name, email, phone, ranking)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [first_name, last_name, email, phone, ranking]
    );

    res.status(201).json({
      message: 'Player created successfully',
      player: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating player:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Player with this email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/players/:id - Update player (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, ranking, wins, losses } = req.body;

    const result = await pool.query(
      `UPDATE players 
       SET first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           email = COALESCE($4, email),
           phone = COALESCE($5, phone),
           ranking = COALESCE($6, ranking),
           wins = COALESCE($7, wins),
           losses = COALESCE($8, losses),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, first_name, last_name, email, phone, ranking, wins, losses]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({
      message: 'Player updated successfully',
      player: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/players/:id - Delete player (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM players WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;