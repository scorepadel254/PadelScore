const pool = require('./database');
const bcrypt = require('bcrypt');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Hash passwords for users
    const adminPassword = await bcrypt.hash('admin123', 10);
    const referee1Password = await bcrypt.hash('referee123', 10);
    const referee2Password = await bcrypt.hash('referee456', 10);

    // Insert users (admin and referees)
    await pool.query(`
      INSERT INTO users (username, email, password, role, first_name, last_name) VALUES
      ('admin', 'admin@padelscore.com', $1, 'admin', 'Admin', 'User'),
      ('emily_carter', 'emily.carter@email.com', $2, 'referee', 'Emily', 'Carter'),
      ('david_lee', 'david.lee@email.com', $3, 'referee', 'David', 'Lee'),
      ('sophia_rodriguez', 'sophia.rodriguez@email.com', $2, 'referee', 'Sophia', 'Rodriguez')
    `, [adminPassword, referee1Password, referee2Password]);

    // Insert players
    await pool.query(`
      INSERT INTO players (first_name, last_name, email, ranking, wins, losses) VALUES
      ('Liam', 'Harper', 'liam.harper@email.com', 1500, 25, 5),
      ('Olivia', 'Bennett', 'olivia.bennett@email.com', 1450, 22, 8),
      ('Noah', 'Foster', 'noah.foster@email.com', 1400, 20, 10),
      ('Ava', 'Coleman', 'ava.coleman@email.com', 1350, 18, 12),
      ('Ethan', 'Hayes', 'ethan.hayes@email.com', 1300, 15, 15),
      ('Isabella', 'Price', 'isabella.price@email.com', 1280, 14, 16),
      ('Mason', 'Ward', 'mason.ward@email.com', 1250, 12, 18),
      ('Sofia', 'Torres', 'sofia.torres@email.com', 1220, 10, 20),
      ('Lucas', 'Morgan', 'lucas.morgan@email.com', 1200, 8, 22),
      ('Emma', 'Cooper', 'emma.cooper@email.com', 1150, 5, 25),
      ('James', 'Rivera', 'james.rivera@email.com', 1120, 4, 26),
      ('Charlotte', 'Bailey', 'charlotte.bailey@email.com', 1100, 3, 27)
    `);

    // Insert teams (pairs of players)
    await pool.query(`
      INSERT INTO teams (name, player1_id, player2_id, ranking, wins, losses) VALUES
      ('Team Thunder', 1, 2, 1475, 15, 3),
      ('Team Lightning', 3, 4, 1375, 12, 6),
      ('Team Storm', 5, 6, 1290, 10, 8),
      ('Team Blaze', 7, 8, 1235, 8, 10),
      ('Team Frost', 9, 10, 1175, 6, 12),
      ('Team Shadow', 11, 12, 1110, 4, 14)
    `);

    // Insert tournaments
    await pool.query(`
      INSERT INTO tournaments (name, description, start_date, end_date, status, max_teams, entry_fee, prize_pool, created_by) VALUES
      ('Spring Open 2024', 'Annual spring tournament for all skill levels', '2024-04-15', '2024-04-17', 'completed', 16, 50.00, 800.00, 1),
      ('Summer Slam 2024', 'High-intensity summer competition', '2024-07-20', '2024-07-22', 'completed', 12, 75.00, 900.00, 1),
      ('Autumn Cup 2024', 'Fall championship series', '2024-10-10', '2024-10-12', 'active', 20, 60.00, 1200.00, 1),
      ('Winter Classic 2024', 'End of year tournament', '2024-12-15', '2024-12-17', 'upcoming', 18, 80.00, 1440.00, 1)
    `);

    // Insert matches
    await pool.query(`
      INSERT INTO matches (tournament_id, team1_id, team2_id, referee_id, scheduled_at, status, court_number, 
                          team1_score_set1, team1_score_set2, team1_score_set3, 
                          team2_score_set1, team2_score_set2, team2_score_set3, winner_id) VALUES
      (1, 1, 2, 2, '2024-04-15 10:00:00', 'completed', 1, 6, 4, 0, 3, 6, 0, 1),
      (1, 3, 4, 3, '2024-04-15 11:30:00', 'completed', 2, 6, 6, 0, 4, 2, 0, 3),
      (2, 2, 3, 2, '2024-07-20 14:00:00', 'completed', 1, 4, 6, 6, 6, 3, 4, 2),
      (3, 1, 3, 2, '2024-10-10 09:00:00', 'in_progress', 1, 6, 0, 0, 4, 0, 0, NULL),
      (3, 2, 4, 3, '2024-10-10 10:30:00', 'scheduled', 2, 0, 0, 0, 0, 0, 0, NULL),
      (4, 1, 4, 4, '2024-12-15 11:00:00', 'scheduled', 1, 0, 0, 0, 0, 0, 0, NULL)
    `);

    console.log('Database seeding completed successfully!');
    console.log('Sample data inserted:');
    console.log('- 4 users (1 admin, 3 referees)');
    console.log('- 12 players');
    console.log('- 6 teams');
    console.log('- 4 tournaments');
    console.log('- 6 matches');

  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    pool.end();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;