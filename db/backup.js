const fs = require('fs');
const path = require('path');
const { getDb, getDbPath } = require('./database');

const backupsDir = path.join(__dirname, '..', 'backups');

if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
}

async function createBackup() {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
        console.error('[Backup] База данных не найдена:', dbPath);
        return;
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const backupPath = path.join(backupsDir, `database_${dateStr}.sqlite`);

    try {
        const db = getDb();
        await db.backup(backupPath);
        console.log(`[Backup] Резервная копия успешно создана: ${backupPath}`);

        // Clean up old backups (keep last 7 days)
        const files = fs.readdirSync(backupsDir)
            .filter(f => f.startsWith('database_') && f.endsWith('.sqlite'))
            .map(f => ({ name: f, path: path.join(backupsDir, f), time: fs.statSync(path.join(backupsDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (files.length > 7) {
            for (let i = 7; i < files.length; i++) {
                fs.unlinkSync(files[i].path);
                console.log(`[Backup] Удалена старая копия: ${files[i].name}`);
            }
        }
    } catch (err) {
        console.error('[Backup] Ошибка при создании резервной копии:', err);
    }
}

module.exports = { createBackup };

