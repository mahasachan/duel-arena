# ⚔️ Enhanced Weapon Duel Arena

🎮 **Play the Enhanced Version**: `index-enhanced.html` - Real-time multiplayer with skills, mana, shop, and inventory!

A feature-rich 2-player dueling game with real-time WebSocket multiplayer, magic system, economy, and advanced combat mechanics.

## 🎮 Game Features

- **Turn-based Combat**: Players take turns attacking each other with different weapons
- **4 Weapon Types**: Sword, Axe, Bow, and Dagger - each with different damage and accuracy
- **Real-time Multiplayer**: Using Supabase for online multiplayer functionality
- **AI Opponent**: Demo mode with AI opponent when Supabase is not configured
- **Responsive Design**: Works on desktop and mobile devices
- **Battle Animations**: Visual feedback with health bars, damage numbers, and attack animations

## 🚀 Quick Start

### Enhanced Multiplayer (Recommended)
1. Start the server: `npm start` or `./start-local.sh`
2. Open `http://localhost:3001/index-enhanced.html`
3. Real-time battles with other players!

### Original Demo Mode
1. Open `index.html` in your web browser  
2. Play against AI opponent offline

### Online Multiplayer Setup

#### 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be set up

#### 2. Create the Database Table
Run this SQL in your Supabase SQL editor:

```sql
-- Create the games table
CREATE TABLE games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status VARCHAR(20) DEFAULT 'waiting',
    player1_id VARCHAR(50),
    player1_name VARCHAR(100),
    player1_health INTEGER DEFAULT 100,
    player2_id VARCHAR(50),
    player2_name VARCHAR(100),
    player2_health INTEGER DEFAULT 100,
    current_turn VARCHAR(50),
    winner VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Create indexes for better performance
CREATE INDEX games_status_idx ON games(status);
CREATE INDEX games_player1_idx ON games(player1_id);
CREATE INDEX games_player2_idx ON games(player2_id);

-- Enable Row Level Security (RLS)
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed)
CREATE POLICY "Anyone can read games" ON games FOR SELECT USING (true);
CREATE POLICY "Anyone can insert games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update games" ON games FOR UPDATE USING (true);
```

#### 3. Configure the Game
1. Copy your Supabase URL and anon key from your project settings
2. Open `game.js` and replace the placeholders:

```javascript
const SUPABASE_URL = 'your-project-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

#### 4. Deploy or Run Locally
- **Local**: Open `index.html` in your browser
- **Deploy**: Upload files to any web hosting service (Netlify, Vercel, GitHub Pages, etc.)

## 🎲 How to Play

1. **Join Game**: Enter your name and click "Join Game"
2. **Wait for Opponent**: In online mode, wait for another player to join
3. **Choose Weapon**: On your turn, select a weapon to attack:
   - ⚔️ **Sword**: 25 damage, 80% accuracy
   - 🪓 **Axe**: 30 damage, 70% accuracy  
   - 🏹 **Bow**: 20 damage, 90% accuracy
   - 🗡️ **Dagger**: 15 damage, 95% accuracy
4. **Battle**: Take turns attacking until one player's health reaches 0
5. **Victory**: The last player standing wins!

## 🛠️ Technical Details

### Frontend Technologies
- **HTML5**: Game structure and layout
- **CSS3**: Animations, responsive design, and visual effects
- **Vanilla JavaScript**: Game logic and real-time updates

### Backend (Optional)
- **Supabase**: PostgreSQL database with real-time subscriptions
- **Real-time**: Live game updates using WebSocket connections

### Game Mechanics
- **Health System**: Both players start with 100 HP
- **Accuracy System**: Each weapon has different hit chances
- **Turn-based**: Players alternate turns
- **Win Condition**: Reduce opponent's health to 0

## 📁 Project Structure

```
/
├── index.html          # Main HTML file
├── style.css          # CSS styles and animations  
├── game.js           # Game logic and Supabase integration
└── README.md         # This file
```

## 🎨 Customization

### Adding New Weapons
Edit the `weapons` object in `game.js`:

```javascript
const weapons = {
    newWeapon: { 
        name: 'New Weapon', 
        emoji: '🔫', 
        damage: 35, 
        accuracy: 0.6 
    }
};
```

### Styling Changes
Modify `style.css` to change colors, animations, or layout.

### Game Balance
Adjust weapon stats, starting health, or add new mechanics in `game.js`.

## 🐛 Troubleshooting

### Common Issues

1. **Game won't connect online**: 
   - Check Supabase credentials in `game.js`
   - Verify the database table exists
   - Check browser console for errors

2. **Demo mode only**:
   - This is normal if Supabase is not configured
   - You can still play against the AI

3. **Styling issues**:
   - Make sure all files are in the same directory
   - Check that `style.css` is loading properly

### Browser Support
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 🚀 Deployment Options

### Free Hosting Services
1. **Netlify**: Drag and drop the files
2. **Vercel**: Connect your GitHub repository
3. **GitHub Pages**: Enable in repository settings
4. **Surge.sh**: Use CLI to deploy

### Custom Domain
Most hosting services allow custom domains in their free tiers.

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to fork this project and submit pull requests for improvements!

### Ideas for Enhancements
- Add sound effects
- Implement special abilities
- Create tournament mode
- Add player statistics
- Include more weapon types
- Add chat functionality

## 📞 Support

If you encounter any issues or have questions, please check the troubleshooting section above or create an issue in the repository.

---

**Enjoy the battle!** ⚔️
