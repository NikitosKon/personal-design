import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

const servicesData = [
  {
    id: 1,
    title: "Logo & Branding",
    description: "Logo, typography, color and asset systems.",
    icon: "fas fa-pen-nib"
  },
  {
    id: 2,
    title: "Graphic Design",
    description: "Posters, banners, social content and ad creatives.",
    icon: "fas fa-image"
  },
  {
    id: 3,
    title: "Video Editing",
    description: "Short-form ads, promos and product videos for socials.",
    icon: "fas fa-film"
  },
  {
    id: 4,
    title: "3D Visualization",
    description: "Product renders, mockups and animated presentations.",
    icon: "fas fa-cube"
  }
];

const portfolioData = [
  {
    id: 1,
    title: "Logo for CoffeeHub",
    description: "Modern mark — applied across packaging and web.",
    image: ""
  },
  {
    id: 2,
    title: "Restaurant Menu",
    description: "Clean layout focused on appetite and conversion.",
    image: ""
  },
  {
    id: 3,
    title: "Instagram Campaign",
    description: "Coherent visual system for multi-platform ads and posts.",
    image: ""
  },
  {
    id: 4,
    title: "Brand Identity for TechStart",
    description: "Complete branding for tech startup including logo and guidelines.",
    image: ""
  },
  {
    id: 5,
    title: "Product Packaging",
    description: "Eye-catching packaging design for consumer goods.",
    image: ""
  },
  {
    id: 6,
    title: "Social Media Kit",
    description: "Complete set of templates for social media marketing.",
    image: ""
  }
];

db.serialize(() => {
  // Обновляем услуги
  db.run(
    'UPDATE content SET content = ? WHERE title = ?',
    [JSON.stringify(servicesData), 'services'],
    function(err) {
      if (err) {
        console.error('Error updating services:', err);
      } else {
        console.log('✅ Services updated successfully');
      }
    }
  );

  // Обновляем портфолио
  db.run(
    'UPDATE content SET content = ? WHERE title = ?',
    [JSON.stringify(portfolioData), 'portfolio'],
    function(err) {
      if (err) {
        console.error('Error updating portfolio:', err);
      } else {
        console.log('✅ Portfolio updated successfully');
      }
    }
  );
});

db.close(() => {
  console.log('🎉 Data import completed!');
  console.log('Restart your server to see changes.');
});