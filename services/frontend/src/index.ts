import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || '8080';

const luxeHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TriCoach - Luxury Training Elite</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --gold: #FFD700;
            --dark-luxe: #0a0a0a;
            --deep-gold: #DAA520;
            --white-prime: #FFFEF9;
            --accent-pink: #FF1493;
            --cyan: #00F0FF;
            --shadow-luxe: 0 20px 60px rgba(255, 215, 0, 0.15);
        }

        html {
            scroll-behavior: smooth;
        }

        body {
            font-family: 'Playfair Display', 'Georgia', serif;
            background: linear-gradient(135deg, var(--dark-luxe) 0%, #1a1a2e 50%, #16213e 100%);
            color: var(--white-prime);
            overflow-x: hidden;
            line-height: 1.6;
        }

        /* LUXE HEADER */
        .header {
            position: fixed;
            top: 0;
            width: 100%;
            z-index: 1000;
            background: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(10px);
            border-bottom: 2px solid var(--gold);
            padding: 1.5rem 2rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: var(--shadow-luxe);
        }

        .logo {
            font-size: 2rem;
            font-weight: 900;
            background: linear-gradient(135deg, var(--gold), var(--accent-pink), var(--cyan));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: 2px;
            text-transform: uppercase;
            animation: logoGlow 3s ease-in-out infinite;
        }

        @keyframes logoGlow {
            0%, 100% { filter: drop-shadow(0 0 8px var(--gold)); }
            50% { filter: drop-shadow(0 0 16px var(--accent-pink)); }
        }

        .nav {
            display: flex;
            gap: 3rem;
            align-items: center;
        }

        .nav-link {
            color: var(--white-prime);
            text-decoration: none;
            font-size: 0.95rem;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 1px;
            position: relative;
            transition: all 0.3s ease;
        }

        .nav-link::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: 0;
            width: 0;
            height: 2px;
            background: linear-gradient(90deg, var(--gold), var(--accent-pink));
            transition: width 0.3s ease;
        }

        .nav-link:hover::after {
            width: 100%;
        }

        .cta-btn {
            background: linear-gradient(135deg, var(--gold), var(--deep-gold));
            color: var(--dark-luxe);
            padding: 0.8rem 2rem;
            border: none;
            border-radius: 50px;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 1px;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-shadow: 0 10px 30px rgba(255, 215, 0, 0.3);
        }

        .cta-btn:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 15px 40px rgba(255, 215, 0, 0.5);
        }

        /* HERO SECTION */
        .hero {
            margin-top: 80px;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow: hidden;
            padding: 2rem;
        }

        .hero::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(255, 215, 0, 0.1), transparent);
            border-radius: 50%;
            animation: float 20s infinite ease-in-out;
        }

        .hero::after {
            content: '';
            position: absolute;
            bottom: -30%;
            left: -5%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(255, 20, 147, 0.08), transparent);
            border-radius: 50%;
            animation: float 25s infinite ease-in-out reverse;
        }

        @keyframes float {
            0%, 100% { transform: translateY(0px) translateX(0px); }
            25% { transform: translateY(-30px) translateX(20px); }
            50% { transform: translateY(-60px) translateX(-20px); }
            75% { transform: translateY(-30px) translateX(20px); }
        }

        .hero-content {
            position: relative;
            z-index: 10;
            text-align: center;
            max-width: 900px;
        }

        .hero-title {
            font-size: 4.5rem;
            font-weight: 900;
            margin-bottom: 1.5rem;
            background: linear-gradient(135deg, var(--gold) 0%, var(--accent-pink) 50%, var(--cyan) 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            line-height: 1.1;
            text-transform: uppercase;
            letter-spacing: 3px;
            animation: slideInDown 0.8s ease-out;
        }

        @keyframes slideInDown {
            from {
                opacity: 0;
                transform: translateY(-50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .hero-subtitle {
            font-size: 1.3rem;
            color: var(--gold);
            margin-bottom: 3rem;
            font-family: 'Montserrat', sans-serif;
            font-weight: 300;
            letter-spacing: 2px;
            animation: slideInUp 0.8s ease-out 0.2s both;
        }

        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .hero-buttons {
            display: flex;
            gap: 2rem;
            justify-content: center;
            flex-wrap: wrap;
            animation: slideInUp 0.8s ease-out 0.4s both;
        }

        .secondary-btn {
            background: transparent;
            color: var(--gold);
            padding: 1rem 2.5rem;
            border: 2px solid var(--gold);
            border-radius: 50px;
            font-weight: 700;
            cursor: pointer;
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 1px;
            transition: all 0.3s ease;
        }

        .secondary-btn:hover {
            background: var(--gold);
            color: var(--dark-luxe);
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(255, 215, 0, 0.4);
        }

        /* FEATURES SECTION */
        .features {
            padding: 6rem 2rem;
            background: linear-gradient(180deg, transparent, rgba(255, 215, 0, 0.03));
            position: relative;
            z-index: 5;
        }

        .section-title {
            text-align: center;
            font-size: 3rem;
            margin-bottom: 4rem;
            color: var(--gold);
            text-transform: uppercase;
            letter-spacing: 3px;
        }

        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 2.5rem;
            max-width: 1400px;
            margin: 0 auto;
        }

        .feature-card {
            background: rgba(255, 215, 0, 0.05);
            border: 1px solid rgba(255, 215, 0, 0.2);
            padding: 2.5rem;
            border-radius: 15px;
            transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
        }

        .feature-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.1), transparent);
            transition: left 0.6s ease;
        }

        .feature-card:hover {
            transform: translateY(-10px) scale(1.02);
            border-color: var(--gold);
            box-shadow: var(--shadow-luxe), inset 0 0 30px rgba(255, 215, 0, 0.1);
        }

        .feature-card:hover::before {
            left: 100%;
        }

        .feature-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        .feature-title {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: var(--white-prime);
            font-weight: 700;
        }

        .feature-text {
            color: rgba(255, 254, 249, 0.8);
            line-height: 1.8;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.95rem;
        }

        /* STATS SECTION */
        .stats {
            padding: 4rem 2rem;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 2rem;
            max-width: 1000px;
            margin: 0 auto;
        }

        .stat-item {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 215, 0, 0.08);
            border-radius: 10px;
            border-left: 4px solid var(--gold);
        }

        .stat-number {
            font-size: 3rem;
            color: var(--gold);
            font-weight: 900;
            margin-bottom: 0.5rem;
        }

        .stat-label {
            color: var(--white-prime);
            font-family: 'Montserrat', sans-serif;
            letter-spacing: 1px;
            font-weight: 600;
        }

        /* CTA SECTION */
        .cta-section {
            padding: 5rem 2rem;
            text-align: center;
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 20, 147, 0.08));
            border-top: 2px solid var(--gold);
            border-bottom: 2px solid var(--gold);
        }

        .cta-title {
            font-size: 2.5rem;
            margin-bottom: 1.5rem;
            color: var(--gold);
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .cta-text {
            font-size: 1.1rem;
            margin-bottom: 2rem;
            color: var(--white-prime);
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        /* FOOTER */
        .footer {
            background: rgba(10, 10, 10, 0.8);
            border-top: 2px solid var(--gold);
            padding: 3rem 2rem;
            text-align: center;
            position: relative;
            z-index: 5;
        }

        .footer-content {
            max-width: 1000px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
        }

        .footer-section h4 {
            color: var(--gold);
            margin-bottom: 1rem;
            font-size: 1.1rem;
            letter-spacing: 1px;
        }

        .footer-section a {
            color: var(--white-prime);
            text-decoration: none;
            font-family: 'Montserrat', sans-serif;
            font-size: 0.9rem;
            display: block;
            margin-bottom: 0.5rem;
            transition: color 0.3s ease;
        }

        .footer-section a:hover {
            color: var(--gold);
        }

        .footer-bottom {
            border-top: 1px solid rgba(255, 215, 0, 0.2);
            padding-top: 2rem;
            color: rgba(255, 254, 249, 0.6);
            font-family: 'Montserrat', sans-serif;
            font-size: 0.9rem;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
            .hero-title {
                font-size: 2.5rem;
            }

            .hero-subtitle {
                font-size: 1rem;
            }

            .nav {
                gap: 1.5rem;
                font-size: 0.9rem;
            }

            .section-title {
                font-size: 2rem;
            }

            .hero-buttons {
                flex-direction: column;
                gap: 1rem;
            }

            .cta-btn, .secondary-btn {
                width: 100%;
            }
        }

        /* SCROLL ANIMATIONS */
        .fade-in {
            animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    </style>
</head>
<body>
    <!-- HEADER -->
    <header class="header">
        <div class="logo">TriCoach Elite</div>
        <nav class="nav">
            <a href="#programs" class="nav-link">Programs</a>
            <a href="#features" class="nav-link">Features</a>
            <a href="#community" class="nav-link">Community</a>
            <button class="cta-btn">Join Now</button>
        </nav>
    </header>

    <!-- HERO -->
    <section class="hero">
        <div class="hero-content">
            <h1 class="hero-title">Serving Luxury Gains</h1>
            <p class="hero-subtitle">Where Champions Train Like Royalty</p>
            <div class="hero-buttons">
                <button class="cta-btn">Start Your Elite Journey</button>
                <button class="secondary-btn">Explore Premium Programs</button>
            </div>
        </div>
    </section>

    <!-- FEATURES -->
    <section id="features" class="features">
        <h2 class="section-title">Your Glorious Arsenal</h2>
        <div class="features-grid">
            <div class="feature-card fade-in">
                <div class="feature-icon">💎</div>
                <h3 class="feature-title">Premium Programs</h3>
                <p class="feature-text">Curated elite training protocols designed by champions. Serve looks and serve results.</p>
            </div>
            <div class="feature-card fade-in">
                <div class="feature-icon">👑</div>
                <h3 class="feature-title">Royal Coaching</h3>
                <p class="feature-text">1-on-1 elite coaching with the industry's finest. Your personal diva demands excellence.</p>
            </div>
            <div class="feature-card fade-in">
                <div class="feature-icon">⚡</div>
                <h3 class="feature-title">Real-time Analytics</h3>
                <p class="feature-text">Track every slay. Visualize your wins. Own your transformation with precision metrics.</p>
            </div>
            <div class="feature-card fade-in">
                <div class="feature-icon">🏆</div>
                <h3 class="feature-title">Achievement Runway</h3>
                <p class="feature-text">Unlock badges and achievements. Walk the runway of success with exclusive rewards.</p>
            </div>
            <div class="feature-card fade-in">
                <div class="feature-icon">🎯</div>
                <h3 class="feature-title">Smart Planning</h3>
                <p class="feature-text">AI-powered personalization. Your goals become our obsession. We serve what you need.</p>
            </div>
            <div class="feature-card fade-in">
                <div class="feature-icon">👥</div>
                <h3 class="feature-title">Elite Community</h3>
                <p class="feature-text">Connect with royalty. Share your wins. Network with the finest trainers and athletes globally.</p>
            </div>
        </div>
    </section>

    <!-- STATS -->
    <section class="stats">
        <div class="stat-item">
            <div class="stat-number">50K+</div>
            <div class="stat-label">Elite Members</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">10M+</div>
            <div class="stat-label">Workouts Served</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">99.8%</div>
            <div class="stat-label">Satisfaction Slayed</div>
        </div>
        <div class="stat-item">
            <div class="stat-number">42+</div>
            <div class="stat-label">Countries Served</div>
        </div>
    </section>

    <!-- CTA SECTION -->
    <section class="cta-section">
        <h2 class="cta-title">Ready to Serve Looks & Gains?</h2>
        <p class="cta-text">Join the elite circle where every workout is a statement, every goal is a victory, and every day you're serving excellence.</p>
        <button class="cta-btn">Claim Your Crown Now</button>
    </section>

    <!-- FOOTER -->
    <footer class="footer">
        <div class="footer-content">
            <div class="footer-section">
                <h4>Programs</h4>
                <a href="#strength">Strength Elite</a>
                <a href="#endurance">Endurance Royal</a>
                <a href="#transformation">Transformation Luxe</a>
            </div>
            <div class="footer-section">
                <h4>Company</h4>
                <a href="#about">About Us</a>
                <a href="#careers">Careers</a>
                <a href="#press">Press</a>
            </div>
            <div class="footer-section">
                <h4>Legal</h4>
                <a href="#privacy">Privacy Policy</a>
                <a href="#terms">Terms of Service</a>
                <a href="#contact">Contact Support</a>
            </div>
        </div>
        <div class="footer-bottom">
            <p>&copy; 2026 TriCoach Elite. Serving Excellence Globally. 👑 XOXO</p>
        </div>
    </footer>

    <script>
        // SMOOTH SCROLL & ANIMATIONS
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href !== '#') {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });

        // INTERSECTION OBSERVER FOR FADE-IN
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.fade-in').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'all 0.8s ease-out';
            observer.observe(el);
        });

        // BUTTON INTERACTIONS
        document.querySelectorAll('.cta-btn, .secondary-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 200);
            });
        });

        console.log('✨ TriCoach Elite Frontend Loaded - Serving Luxury Gains Since Day 1 👑');
    </script>
</head>
</body>
</html>`;

app.get('/', (req: Request, res: Response) => {
  res.status(200).send(luxeHTML);
});

app.listen(Number(port), () => {
  console.log(`TriCoach Elite Frontend serving on port ${port} 👑`);
});
