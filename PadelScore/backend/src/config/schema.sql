-- PADELSCORE Database Schema
-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS tournaments;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS users;

-- Create users table (admins and referees)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'referee')) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create players table
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    ranking INTEGER DEFAULT 1000,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create teams table
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    player1_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    player2_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    ranking INTEGER DEFAULT 1000,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tournaments table
CREATE TABLE tournaments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) CHECK (status IN ('upcoming', 'active', 'completed')) DEFAULT 'upcoming',
    max_teams INTEGER,
    entry_fee DECIMAL(10,2),
    prize_pool DECIMAL(10,2),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create matches table
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
    team1_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    team2_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    referee_id INTEGER REFERENCES users(id),
    scheduled_at TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'scheduled',
    court_number INTEGER,
    team1_score_set1 INTEGER DEFAULT 0,
    team1_score_set2 INTEGER DEFAULT 0,
    team1_score_set3 INTEGER DEFAULT 0,
    team2_score_set1 INTEGER DEFAULT 0,
    team2_score_set2 INTEGER DEFAULT 0,
    team2_score_set3 INTEGER DEFAULT 0,
    winner_id INTEGER REFERENCES teams(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX idx_matches_referee_id ON matches(referee_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_teams_players ON teams(player1_id, player2_id);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_players_ranking ON players(ranking DESC);
CREATE INDEX idx_teams_ranking ON teams(ranking DESC);