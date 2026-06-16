const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*", // Erlaubt Verbindungen von allen Geräten (Handy & PC)
        methods: ["GET", "POST"]
    }
});
const path = require('path');

// Port-Zuweisung: Nutzt den Port von Render (process.env.PORT) oder lokal 3000
const PORT = process.env.PORT || 3000;

// Statische Dateien erlauben (falls du Bilder/Logos im selben Ordner hast)
app.use(express.static(__dirname));

// ROUTE 1: PC-Ansicht (Startseite)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ROUTE 2: Handy-Ansicht
app.get('/mobile', (req, res) => {
    res.sendFile(path.join(__dirname, 'mobile.html'));
});

// WebSockets Kommunikation
io.on('connection', (socket) => {
    console.log('Ein Gerät hat sich verbunden:', socket.id);

    // Raum beitreten (wichtig für die QR-Code Zuordnung)
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`Gerät ${socket.id} ist Raum beigetreten: ${roomId}`);
    });

    // Sensordaten vom Handy empfangen und an den PC im selben Raum weiterleiten
    socket.on('sensor-data', (data) => {
        // Falls ein Raum-Kontext mitgesendet wird, nutzen wir diesen
        if (data.room) {
            socket.to(data.room).emit('pc-receive-data', data);
        } else {
            // Ausweichlösung: An alle Räume senden, in denen das Handy ist
            const rooms = Array.from(socket.rooms);
            rooms.forEach(room => {
                if (room !== socket.id) {
                    socket.to(room).emit('pc-receive-data', data);
                }
            });
        }
    });

    // Befehl vom PC: Schritt 1 auf dem Handy aktivieren
    socket.on('pc-trigger-step-1', (roomId) => {
        io.to(roomId).emit('handy-set-step-1');
    });

    // Befehl vom PC: Schritt 2 auf dem Handy aktivieren
    socket.on('pc-trigger-step-2', (roomId) => {
        io.to(roomId).emit('handy-set-step-2');
    });

    socket.on('disconnect', () => {
        console.log('Verbindung getrennt:', socket.id);
    });
});

// Server starten
http.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`   Monitor Leveler Server läuft auf Port ${PORT} `);
    console.log(`=============================================`);
});
