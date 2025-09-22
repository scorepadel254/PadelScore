const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/matches - Get all matches
router.get('/', async (req, res) => {
  try {
    const { status, tournament_id } = req.query;
    
    let query = `
      SELECT m.*,
             t1.name as team1_name, t2.name as team2_name,
             tournament.name as tournament_name,
             u.first_name as referee_first_name, u.last_name as referee_last_name
      FROM matches m
      JOIN teams t1 ON m.team1_id = t1.id
      JOIN teams t2 ON m.team2_id = t2.id
      JOIN tournaments tournament ON m.tournament_id = tournament.id
      LEFT JOIN users u ON m.referee_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND m.status = $${paramCount}`;
      params.push(status);
    }

    if (tournament_id) {
      paramCount++;
      query += ` AND m.tournament_id = $${paramCount}`;
      params.push(tournament_id);
    }

    query += ' ORDER BY m.scheduled_at ASC';

    const result = await pool.query(query, params);

    res.json({
      matches: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/matches/:id - Get single match with detailed info
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT m.*,
             t1.name as team1_name, 
             p1a.first_name as team1_player1_first_name, p1a.last_name as team1_player1_last_name,
             p1b.first_name as team1_player2_first_name, p1b.last_name as team1_player2_last_name,
             t2.name as team2_name,
             p2a.first_name as team2_player1_first_name, p2a.last_name as team2_player1_last_name,
             p2b.first_name as team2_player2_first_name, p2b.last_name as team2_player2_last_name,
             tournament.name as tournament_name,
             u.first_name as referee_first_name, u.last_name as referee_last_name
      FROM matches m
      JOIN teams t1 ON m.team1_id = t1.id
      JOIN teams t2 ON m.team2_id = t2.id
      JOIN tournaments tournament ON m.tournament_id = tournament.id
      JOIN players p1a ON t1.player1_id = p1a.id
      JOIN players p1b ON t1.player2_id = p1b.id
      JOIN players p2a ON t2.player1_id = p2a.id
      JOIN players p2b ON t2.player2_id = p2b.id
      LEFT JOIN users u ON m.referee_id = u.id
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const match = result.rows[0];
    res.json({
      match: {
        ...match,
        team1_players: [
          { first_name: match.team1_player1_first_name, last_name: match.team1_player1_last_name },
          { first_name: match.team1_player2_first_name, last_name: match.team1_player2_last_name }
        ],
        team2_players: [
          { first_name: match.team2_player1_first_name, last_name: match.team2_player1_last_name },
          { first_name: match.team2_player2_first_name, last_name: match.team2_player2_last_name }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/matches - Create new match (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const {
      tournament_id,
      team1_id,
      team2_id,
      referee_id,
      scheduled_at,
      court_number
    } = req.body;

    if (!tournament_id || !team1_id || !team2_id) {
      return res.status(400).json({ error: 'Tournament ID, team1 ID, and team2 ID are required' });
    }

    if (team1_id === team2_id) {
      return res.status(400).json({ error: 'A team cannot play against itself' });
    }

    const result = await pool.query(
      `INSERT INTO matches (tournament_id, team1_id, team2_id, referee_id, scheduled_at, court_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [tournament_id, team1_id, team2_id, referee_id, scheduled_at, court_number]
    );

    res.status(201).json({
      message: 'Match created successfully',
      match: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/matches/:id/score - Update match score (Referee or Admin)
router.put('/:id/score', authenticateToken, requireRole(['admin', 'referee']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      team1_score_set1, team1_score_set2, team1_score_set3,
      team2_score_set1, team2_score_set2, team2_score_set3,
      status, winner_id
    } = req.body;

    // If user is referee, check if they are assigned to this match
    if (req.user.role === 'referee') {
      const matchCheck = await pool.query(
        'SELECT referee_id FROM matches WHERE id = $1',
        [id]
      );
      
      if (matchCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Match not found' });
      }
      
      if (matchCheck.rows[0].referee_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only update scores for matches you are refereeing' });
      }
    }

    const result = await pool.query(
      `UPDATE matches 
       SET team1_score_set1 = COALESCE($2, team1_score_set1),
           team1_score_set2 = COALESCE($3, team1_score_set2),
           team1_score_set3 = COALESCE($4, team1_score_set3),
           team2_score_set1 = COALESCE($5, team2_score_set1),
           team2_score_set2 = COALESCE($6, team2_score_set2),
           team2_score_set3 = COALESCE($7, team2_score_set3),
           status = COALESCE($8, status),
           winner_id = COALESCE($9, winner_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, team1_score_set1, team1_score_set2, team1_score_set3, 
          team2_score_set1, team2_score_set2, team2_score_set3, status, winner_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const updatedMatch = result.rows[0];

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    io.to(`match-${id}`).emit('score-update', {
      matchId: id,
      match: updatedMatch,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Match score updated successfully',
      match: updatedMatch
    });
  } catch (error) {
    console.error('Error updating match score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/matches/:id - Update match details (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { referee_id, scheduled_at, court_number, status } = req.body;

    const result = await pool.query(
      `UPDATE matches 
       SET referee_id = COALESCE($2, referee_id),
           scheduled_at = COALESCE($3, scheduled_at),
           court_number = COALESCE($4, court_number),
           status = COALESCE($5, status),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, referee_id, scheduled_at, court_number, status]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({
      message: 'Match updated successfully',
      match: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;