CREATE TABLE user_profile (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(80) UNIQUE NOT NULL,
    password VARCHAR(80) NOT NULL
);

CREATE TABLE artist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    avatar_link VARCHAR(255),
    full_name VARCHAR(255),
    artist_name VARCHAR(255),
    location VARCHAR(255),
    bio TEXT,
    email VARCHAR(255),
    phone VARCHAR(50),
    instagram VARCHAR(255),
    soundCloud VARCHAR(255),
    youtube VARCHAR(255),
    experience_level ENUM('beginner','intermediate','advanced','professional'),
    years_experience INT,
    availabilitie TEXT,
    FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE
);

CREATE TABLE genre (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE artist_genre (
    artist_id INT,
    genre_id INT,
    PRIMARY KEY (artist_id, genre_id),
    FOREIGN KEY (artist_id) REFERENCES artist(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genre(id) ON DELETE CASCADE
);

CREATE TABLE studio_genre (
    studio_id INT,
    genre_id INT,
    PRIMARY KEY (studio_id, genre_id),
    FOREIGN KEY (studio_id) REFERENCES studio(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genre(id) ON DELETE CASCADE
);

CREATE TABLE instruments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE artist_instruments (
    artist_id INT,
    instrument_id INT,
    PRIMARY KEY (artist_id, instrument_id),
    FOREIGN KEY (artist_id) REFERENCES artist(id) ON DELETE CASCADE,
    FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE
);

CREATE TABLE colaborators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE artist_colaborators (
    artist_id INT,
    colaborators_id INT,
    PRIMARY KEY (artist_id, colaborators_id),
    FOREIGN KEY (artist_id) REFERENCES artist(id) ON DELETE CASCADE,
    FOREIGN KEY (colaborators_id) REFERENCES colaborators(id) ON DELETE CASCADE
);

CREATE TABLE language (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE artist_language (
    artist_id INT,
    language_id INT,
    PRIMARY KEY (artist_id, language_id),
    FOREIGN KEY (artist_id) REFERENCES artist(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES language(id) ON DELETE CASCADE
);

CREATE TABLE studio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    description TEXT,
    avatar_link VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    instagram VARCHAR(255),
    soundCloud VARCHAR(255),
    youtube VARCHAR(255),
    studio_rules TEXT,
    cancellation_policy TEXT,
    FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE
);

CREATE TABLE gallery (
    id INT AUTO_INCREMENT PRIMARY KEY,
    link VARCHAR(255) NOT NULL
);

CREATE TABLE studio_gallery (
    studio_id INT,
    gallery_id INT,
    PRIMARY KEY (studio_id, gallery_id),
    FOREIGN KEY (studio_id) REFERENCES studio(id) ON DELETE CASCADE,
    FOREIGN KEY (gallery_id) REFERENCES gallery(id) ON DELETE CASCADE
);

CREATE TABLE equipement (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE studio_equipement (
    studio_id INT,
    equipement_id INT,
    PRIMARY KEY (studio_id, equipement_id),
    FOREIGN KEY (studio_id) REFERENCES studio(id) ON DELETE CASCADE,
    FOREIGN KEY (equipement_id) REFERENCES equipement(id) ON DELETE CASCADE
);

CREATE TABLE type (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE studio_type (
    studio_id INT,
    type_id INT,
    PRIMARY KEY (studio_id, type_id),
    FOREIGN KEY (studio_id) REFERENCES studio(id) ON DELETE CASCADE,
    FOREIGN KEY (type_id) REFERENCES type(id) ON DELETE CASCADE
);

CREATE TABLE studio_language (
    studio_id INT,
    language_id INT,
    PRIMARY KEY (studio_id, language_id),
    FOREIGN KEY (studio_id) REFERENCES studio(id) ON DELETE CASCADE,
    FOREIGN KEY (language_id) REFERENCES language(id) ON DELETE CASCADE
);

CREATE TABLE portfolio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(255) NOT NULL,
    type ENUM('image','video','audio','document'),
    title VARCHAR(255)
);

CREATE TABLE artist_portfolio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    artist_id INT,
    portfolio_id INT,
    FOREIGN KEY (artist_id) REFERENCES artist(id) ON DELETE CASCADE,
    FOREIGN KEY (portfolio_id) REFERENCES portfolio(id) ON DELETE CASCADE
);

CREATE TABLE schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday'),
    start_time TIME,
    end_time TIME
);

CREATE TABLE studio_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT,
    studio_id INT,
    FOREIGN KEY (schedule_id) REFERENCES schedule(id) ON DELETE CASCADE,
    FOREIGN KEY (studio_id) REFERENCES studio(id) ON DELETE CASCADE
);

CREATE TABLE service (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price_type ENUM('hour','session', 'day'),
    price DOUBLE,
    duration TIME,
    max_capacity INT,
    available_timing VARCHAR(255),
    description TEXT
);

CREATE TABLE tag (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE service_tag (
    service_id INT,
    tag_id INT,
    PRIMARY KEY (service_id, tag_id),
    FOREIGN KEY (service_id) REFERENCES service(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
);

CREATE TABLE studio_service (
    id INT AUTO_INCREMENT PRIMARY KEY,
    studio_id INT,
    service_id INT,
    FOREIGN KEY (studio_id) REFERENCES studio(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES service(id) ON DELETE CASCADE
);

CREATE TABLE booking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    studio_id INT,
    booking_date DATE,
    booking_time TIME,
    nbr_guests INT,
    FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE,
    FOREIGN KEY (studio_id) REFERENCES studio(id) ON DELETE CASCADE
);

CREATE TABLE favorite_studio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    artist_id INT,
    studio_id INT,
    FOREIGN KEY (artist_id) REFERENCES artist(id) ON DELETE CASCADE,
    FOREIGN KEY (studio_id) REFERENCES studio(id) ON DELETE CASCADE
);

CREATE TABLE review (
    id INT AUTO_INCREMENT PRIMARY KEY,
    artist_id INT,
    studio_id INT,
    rating INT,
    comment VARCHAR(255),
    review_date DATETIME,
    FOREIGN KEY (artist_id) REFERENCES artist(id) ON DELETE CASCADE,
    FOREIGN KEY (studio_id) REFERENCES studio(id) ON DELETE CASCADE
);

CREATE TABLE points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    artist_id INT,
    total_points INT,
    level VARCHAR(255),
    FOREIGN KEY (artist_id) REFERENCES artist(id) ON DELETE CASCADE
);

CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT,
    artist_id INT,
    studio_id INT,
    transaction_date DATETIME,
    amount DOUBLE,
    status ENUM('pending','completed','failed','refunded'),
    FOREIGN KEY (booking_id) REFERENCES booking(id) ON DELETE CASCADE,
    FOREIGN KEY (artist_id) REFERENCES artist(id) ON DELETE CASCADE,
    FOREIGN KEY (studio_id) REFERENCES studio(id) ON DELETE CASCADE
);

CREATE TABLE notification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(255),
    content TEXT,
    created_at DATETIME,
    is_read TINYINT(1) DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES user_profile(id) ON DELETE CASCADE
);

-- Artist settings
CREATE TABLE artist_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_settings_id INT,
    visibility ENUM('public', 'studios only', 'private') NOT NULL DEFAULT 'public',
    show_reviews_public BOOLEAN DEFAULT TRUE,
    language_id INT,
    currency ENUM('USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD') NOT NULL DEFAULT 'USD',
    time_format ENUM('12-hour', '24-hour') NOT NULL DEFAULT '24-hour',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (notification_settings_id) REFERENCES notification_settings(id),
    FOREIGN KEY (language_id) REFERENCES language(id)
);

-- Account (connected or disconnected)
CREATE TABLE account (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account VARCHAR(255) NOT NULL,
    status ENUM('connected', 'disconnected') NOT NULL DEFAULT 'disconnected'
);

-- Payout methods (types)
CREATE TABLE payout_method (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    number VARCHAR(50)
);

-- Payout method assigned to a user
CREATE TABLE payout_method_user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payout_method_id INT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (payout_method_id) REFERENCES payout_method(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Connected account assigned to a user
CREATE TABLE connected_account_user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (account_id) REFERENCES account(id)
);

-- Notification settings main
CREATE TABLE notification_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_reminder_id INT,
    artist_review_reminder_id INT,
    payout_updates_id INT,
    FOREIGN KEY (booking_reminder_id) REFERENCES booking_reminder(id),
    FOREIGN KEY (artist_review_reminder_id) REFERENCES artist_review_reminder(id),
    FOREIGN KEY (payout_updates_id) REFERENCES payout_updates(id)
);

-- Booking reminder settings
CREATE TABLE booking_reminder (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email BOOLEAN DEFAULT TRUE,
    sms BOOLEAN DEFAULT FALSE,
    notification BOOLEAN DEFAULT TRUE
);

-- Artist review reminder settings
CREATE TABLE artist_review_reminder (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email BOOLEAN DEFAULT TRUE,
    sms BOOLEAN DEFAULT FALSE,
    notification BOOLEAN DEFAULT TRUE
);

-- Payout updates settings
CREATE TABLE payout_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email BOOLEAN DEFAULT TRUE,
    sms BOOLEAN DEFAULT FALSE,
    notification BOOLEAN DEFAULT TRUE
);


-- Create payment_method table
CREATE TABLE payment_method (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    number VARCHAR(50)
);

-- Create payment_user table
CREATE TABLE payment_user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payout_method_id INT NOT NULL,
    user_id INT NOT NULL,
    FOREIGN KEY (payout_method_id) REFERENCES payment_method(id),
    FOREIGN KEY (user_id) REFERENCES users(id) -- Assuming your users table is called 'users'
);

-- inserting some testing data :

-- Insert some users
INSERT INTO user_profile (email, password) VALUES
('alice@example.com', 'password123'),
('bob@example.com', 'securepass'),
('charlie@example.com', 'charliepwd');

-- Insert artists linked to users
INSERT INTO artist (user_id, avatar_link, full_name, artist_name, location, bio, email, phone, instagram, soundCloud, youtube, experience_level, years_experience, availabilitie) VALUES
(1, 'https://example.com/avatars/alice.jpg', 'Alice Johnson', 'DJ Alice', 'New York', 'DJ and music producer.', 'alice.artist@example.com', '123-456-7890', '@alice_insta', 'alice_scloud', 'alice_youtube', 'professional', 8, 'Weekdays evenings'),
(2, 'https://example.com/avatars/bob.jpg', 'Bob Smith', 'GuitarBob', 'Los Angeles', 'Guitar player and songwriter.', 'bob.artist@example.com', '987-654-3210', '@bob_insta', 'bob_scloud', 'bob_youtube', 'advanced', 5, 'Weekends only');

-- Insert genres
INSERT INTO genre (name) VALUES
('Rock'),
('Electronic'),
('Jazz'),
('Hip Hop');

-- Link artists to genres
INSERT INTO artist_genre (artist_id, genre_id) VALUES
(1, 2), -- DJ Alice - Electronic
(2, 1), -- GuitarBob - Rock
(2, 3); -- GuitarBob - Jazz

-- Insert instruments
INSERT INTO instruments (name) VALUES
('Guitar'),
('Synthesizer'),
('Drums');

-- Link artists to instruments
INSERT INTO artist_instruments (artist_id, instrument_id) VALUES
(1, 2), -- DJ Alice - Synthesizer
(2, 1), -- GuitarBob - Guitar
(2, 3); -- GuitarBob - Drums

-- Insert collaborators
INSERT INTO colaborators (name) VALUES
('Eve Collaborator'),
('Frank Collaborator');

-- Link artists to collaborators
INSERT INTO artist_colaborators (artist_id, colaborators_id) VALUES
(1, 1),
(2, 2);

-- Insert languages
INSERT INTO language (name) VALUES
('English'),
('French'),
('Spanish');

-- Link artists to languages
INSERT INTO artist_language (artist_id, language_id) VALUES
(1, 1),
(1, 2),
(2, 1);

-- Insert studios (linked to users)
INSERT INTO studio (user_id, name, location, description, avatar_link, email, phone, website, instagram, soundCloud, youtube, studio_rules, cancellation_policy) VALUES
(3, 'Studio A', 'New York', 'Top-notch studio with great equipment.', 'https://example.com/studios/studioA.jpg', 'studioA@example.com', '111-222-3333', 'https://studioa.example.com', '@studioa', 'studioa_scloud', 'studioa_youtube', 'No smoking.', '24h cancellation notice'),
(2, 'Studio B', 'Los Angeles', 'Cozy studio for small groups.', 'https://example.com/studios/studioB.jpg', 'studioB@example.com', '444-555-6666', 'https://studiob.example.com', '@studiob', 'studiob_scloud', 'studiob_youtube', 'Keep clean.', '48h cancellation notice');

-- Insert studio genres
INSERT INTO studio_genre (studio_id, genre_id) VALUES
(1, 2), -- Studio A - Electronic
(1, 4), -- Studio A - Hip Hop
(2, 1); -- Studio B - Rock

-- Insert gallery entries
INSERT INTO gallery (link) VALUES
('https://example.com/gallery/1.jpg'),
('https://example.com/gallery/2.jpg');

-- Link gallery to studios
INSERT INTO studio_gallery (studio_id, gallery_id) VALUES
(1, 1),
(1, 2);

-- Insert equipements
INSERT INTO equipement (name) VALUES
('Microphone'),
('Mixer'),
('Speaker');

-- Link equipements to studios
INSERT INTO studio_equipement (studio_id, equipement_id) VALUES
(1, 1),
(1, 2),
(2, 3);

-- Insert studio types
INSERT INTO type (name) VALUES
('Recording'),
('Mixing'),
('Mastering');

-- Link studio types
INSERT INTO studio_type (studio_id, type_id) VALUES
(1, 1),
(1, 2),
(2, 1);

-- Link studio languages
INSERT INTO studio_language (studio_id, language_id) VALUES
(1, 1),
(1, 2),
(2, 1);

-- Insert portfolio entries
INSERT INTO portfolio (url, type, title) VALUES
('https://example.com/portfolio/alice1.mp3', 'audio', 'Alice Track 1'),
('https://example.com/portfolio/bob1.mp4', 'video', 'Bob Live Session');

-- Link portfolios to artists
INSERT INTO artist_portfolio (artist_id, portfolio_id) VALUES
(1, 1),
(2, 2);

-- Insert schedules
INSERT INTO schedule (day, start_time, end_time) VALUES
('monday', '09:00:00', '17:00:00'),
('tuesday', '10:00:00', '18:00:00');

-- Link studio schedules
INSERT INTO studio_schedule (schedule_id, studio_id) VALUES
(1, 1),
(2, 1);

-- Insert services
INSERT INTO service (name, price_type, price, duration, max_capacity, available_timing, description) VALUES
('Recording Session', 'hour', 50.00, '01:00:00', 5, 'Weekdays', 'High quality recording session'),
('Mixing Session', 'session', 200.00, '02:00:00', 3, 'Weekends', 'Professional mixing');

-- Insert tags
INSERT INTO tag (name) VALUES
('Professional'),
('Affordable');

-- Link services to tags
INSERT INTO service_tag (service_id, tag_id) VALUES
(1, 1),
(2, 2);

-- Link services to studios
INSERT INTO studio_service (studio_id, service_id) VALUES
(1, 1),
(2, 2);

-- Insert bookings
INSERT INTO booking (user_id, studio_id, booking_date, booking_time, nbr_guests) VALUES
(1, 1, '2025-09-01', '10:00:00', 2),
(2, 2, '2025-09-02', '14:00:00', 3);

-- Insert favorites
INSERT INTO favorite_studio (artist_id, studio_id) VALUES
(1, 1),
(2, 2);

-- Insert reviews
INSERT INTO review (artist_id, studio_id, rating, comment, review_date) VALUES
(1, 1, 5, 'Amazing studio and great staff!', '2025-08-10 12:00:00'),
(2, 2, 4, 'Good experience, will come back.');

-- Insert points
INSERT INTO points (artist_id, total_points, level) VALUES
(1, 1500, 'Gold'),
(2, 800, 'Silver');

-- Insert transactions
INSERT INTO transactions (booking_id, artist_id, studio_id, transaction_date, amount, status) VALUES
(1, 1, 1, '2025-08-10 13:00:00', 100.00, 'completed'),
(2, 2, 2, '2025-08-11 15:00:00', 200.00, 'pending');

-- Insert notifications
INSERT INTO notification (user_id, title, content, created_at, is_read) VALUES
(1, 'Welcome', 'Welcome to the platform!', '2025-08-10 10:00:00', 0),
(2, 'Reminder', 'Your booking is tomorrow.', '2025-08-09 09:00:00', 1);

-- Booking reminder
INSERT INTO booking_reminder (email, sms, notification) VALUES
(TRUE, FALSE, TRUE);

-- Artist review reminder
INSERT INTO artist_review_reminder (email, sms, notification) VALUES
(TRUE, TRUE, TRUE);

-- Payout updates
INSERT INTO payout_updates (email, sms, notification) VALUES
(TRUE, FALSE, TRUE);

-- Notification settings
INSERT INTO notification_settings (booking_reminder_id, artist_review_reminder_id, payout_updates_id)
VALUES (1, 1, 1);

-- Account types
INSERT INTO account (account, status) VALUES
('PayPal', 'connected'),
('Stripe', 'disconnected');

-- Payout methods
INSERT INTO payout_method (name, email, number) VALUES
('Bank Transfer', 'user@bank.com', '123456789'),
('PayPal', 'user@paypal.com', NULL);


INSERT INTO payment_method (id, name, email, number)
VALUES
(1, 'PayPal', 'paypal@example.com', 'paypal-account-id'),
(2, 'Bank Transfer', 'bank@example.com', '1234567890'),
(3, 'Stripe', 'stripe@example.com', 'stripe-account-id');

INSERT INTO payment_user (id, payout_method_id, user_id)
VALUES
(1, 1, 10),  -- User 10 uses PayPal
(2, 2, 15),  -- User 15 uses Bank Transfer
(3, 3, 20),  -- User 20 uses Stripe
(4, 1, 25);  -- User 25 uses PayPal
