const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// GET /api/leaderboard/:tournamentId - Get tournament leaderboard
router.get('/:tournamentId', async (req, res) => {
  try {
    const { tournamentId } = req.params;

    // Verify tournament exists
    const tournamentCheck = await pool.query(
      'SELECT id, name FROM tournaments WHERE id = $1',
      [tournamentId]
    );

    if (tournamentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const tournament = tournamentCheck.rows[0];

    // Get leaderboard data
    const result = await pool.query(`
      SELECT t.id, t.name, t.ranking,
             p1.first_name || ' ' || p1.last_name as player1_name,
             p2.first_name || ' ' || p2.last_name as player2_name,
             COUNT(CASE WHEN m.status = 'completed' THEN m.id END) as matches_played,
             SUM(CASE WHEN m.winner_id = t.id AND m.status = 'completed' THEN 1 ELSE 0 END) as wins,
             COUNT(CASE WHEN m.status = 'completed' THEN m.id END) - SUM(CASE WHEN m.winner_id = t.id AND m.status = 'completed' THEN 1 ELSE 0 END) as losses,
             SUM(CASE WHEN m.winner_id = t.id AND m.status = 'completed' THEN 3 ELSE 0 END) as points,
             -- Calculate sets won/lost for better ranking
             SUM(CASE WHEN m.team1_id = t.id THEN 
               (CASE WHEN m.team1_score_set1 > m.team2_score_set1 THEN 1 ELSE 0 END) +
               (CASE WHEN m.team1_score_set2 > m.team2_score_set2 THEN 1 ELSE 0 END) +
               (CASE WHEN m.team1_score_set3 > m.team2_score_set3 THEN 1 ELSE 0 END)
               WHEN m.team2_id = t.id THEN
               (CASE WHEN m.team2_score_set1 > m.team1_score_set1 THEN 1 ELSE 0 END) +
               (CASE WHEN m.team2_score_set2 > m.team1_score_set2 THEN 1 ELSE 0 END) +
               (CASE WHEN m.team2_score_set3 > m.team1_score_set3 THEN 1 ELSE 0 END)
               ELSE 0 END) as sets_won
      FROM teams t
      JOIN players p1 ON t.player1_id = p1.id
      JOIN players p2 ON t.player2_id = p2.id
      LEFT JOIN matches m ON (t.id = m.team1_id OR t.id = m.team2_id) AND m.tournament_id = $1
      GROUP BY t.id, t.name, t.ranking, p1.first_name, p1.last_name, p2.first_name, p2.last_name
      HAVING COUNT(CASE WHEN m.status = 'completed' THEN m.id END) > 0 OR COUNT(m.id) > 0
      ORDER BY points DESC, wins DESC, sets_won DESC, t.ranking DESC
    `, [tournamentId]);

    res.json({
      tournament: {
        id: tournament.id,
        name: tournament.name
      },
      leaderboard: result.rows,
      total_teams: result.rows.length,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;