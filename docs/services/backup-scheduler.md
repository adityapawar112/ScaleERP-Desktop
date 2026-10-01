# Backup Scheduler Documentation

The Backup Scheduler provides automated database backup functionality using `node-cron` for scheduling.

## Overview

| Aspect | Details |
|--------|---------|
| **Library** | node-cron 4.2.1 |
| **Location** | `electron/services/backupScheduler.ts` |
| **Integration** | Initialized in main process |
| **Storage** | Local file system |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  BackupScheduler                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Settings Management                    │   │
│  │  - auto_backup_enabled                              │   │
│  │  - backup_frequency (daily/weekly/monthly)          │   │
│  │  - backup_location                                  │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Cron Scheduler                         │   │
│  │  - Schedule based on frequency                      │   │
│  │  - Execute backup at configured time                │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                  │
│                          ▼                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Backup Execution                       │   │
│  │  - Create database copy                             │   │
│  │  - Compress with adm-zip                            │   │
│  │  - Log to backup_history                            │   │
│  │  - Clean up old backups                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## BackupScheduler Class

### Constructor

```typescript
class BackupScheduler {
  private dbManager: DatabaseManager;
  private cronJob: cron.ScheduledTask | null = null;
  private settings: BackupSettings | null = null;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
  }
}
```

### Key Methods

#### `start()`

Starts the backup scheduler. Performs a "catch-up" check on startup to see if a backup was missed while the app was closed.

```typescript
async start(): Promise<void> {
  await this.loadSettings();
  await this.performCatchUpCheck();

  // Run strictly at 2:00 AM every day
  const cronExpression = '0 2 * * *';

  this.cronJob = cron.schedule(cronExpression, async () => {
    await this.performTimeTaggedBackup();
  });
}
```

#### `performTimeTaggedBackup()`

The core automated backup routine. It creates a binary copy, compresses it, and applies a retention tag (`daily`, `weekly`, `monthly`, `yearly`).

```typescript
private async performTimeTaggedBackup(): Promise<void> {
  // 1. Create binary backup via DatabaseManager
  const result = await this.databaseManager.createBackup('auto');
  
  // 2. Tag file for retention (e.g., -daily.zip)
  const tag = this.getTagForDate(new Date());
  const newPath = this.injectTag(result.path, tag);
  
  // 3. Enqueue for Cloud Sync
  await googleDriveService.enqueue(newPath);
  
  // 4. Cleanup old backups based on strict retention
  await this.cleanupOldBackups();
}
```

## Retention Policy

ScaleERP implements a **Strict GFS (Grandfather-Father-Son)** retention policy:
- **Daily**: Latest 3 backups.
- **Weekly**: Latest 3 backups.
- **Monthly**: Latest 3 backups.
- **Yearly**: Kept indefinitely.
- **Manual**: Kept indefinitely (tagged with `-manual`).

#### `cleanOldBackups()`

Removes old backups based on retention policy.

```typescript
private async cleanOldBackups(): Promise<void> {
  const retentionDays = {
    daily: 7,      // Keep 7 daily backups
    weekly: 30,    // Keep 30 days of weekly backups
    monthly: 365   // Keep 1 year of monthly backups
  };
  
  const days = retentionDays[this.settings.backupFrequency];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  // Get backup history
  const backups = await this.getBackupHistory();
  
  for (const backup of backups) {
    const backupDate = new Date(backup.timestamp);
    if (backupDate < cutoffDate && backup.type === 'auto') {
      // Delete old backup file
      if (fs.existsSync(backup.path)) {
        fs.unlinkSync(backup.path);
      }
    }
  }
}
```

## Backup Types

| Type | Trigger | Description |
|------|---------|-------------|
| `auto` | Scheduled | Automatic backup based on frequency |
| `manual` | User action | User-initiated backup |
| `pre_operation` | Before major change | Safety backup before delete/update |
| `pre_restore` | Before restore | Backup before restoring from backup |

## Cron Schedules

### Daily Backup

```typescript
// 2:00 AM every day
'0 2 * * *'
```

### Weekly Backup

```typescript
// 2:00 AM every Sunday
'0 2 * * 0'
```

### Monthly Backup

```typescript
// 2:00 AM on 1st of month
'0 2 1 * *'
```

## IPC Integration

### Backup Channels

```typescript
// Create manual backup
await window.electronAPI.db.invoke('backup:create');

// Get backup settings
const settings = await window.electronAPI.db.invoke('backup:getSettings');

// Update backup settings
await window.electronAPI.db.invoke('backup:updateSettings', {
  autoBackupEnabled: true,
  backupFrequency: 'weekly',
  backupLocation: '/path/to/backups'
});

// Get backup history
const history = await window.electronAPI.db.invoke('backup:getHistory');

// Restore from backup
await window.electronAPI.db.invoke('backup:restore', backupPath);
```

### Handler Registration

```typescript
// electron/ipc/handlers.ts
export function registerBackupHandlers(): void {
  ipcMain.handle('backup:create', async () => {
    return await backupScheduler.createBackup('manual');
  });
  
  ipcMain.handle('backup:getSettings', async () => {
    return await backupScheduler.getSettings();
  });
  
  ipcMain.handle('backup:updateSettings', async (event, settings) => {
    return await backupScheduler.updateSettings(settings);
  });
  
  ipcMain.handle('backup:getHistory', async () => {
    return await backupScheduler.getBackupHistory();
  });
  
  ipcMain.handle('backup:restore', async (event, backupPath) => {
    return await backupScheduler.restoreBackup(backupPath);
  });
}
```

## Backup File Format

### Naming Convention

```
scaleerp-backup-{timestamp}.zip
```

Example:
```
scaleerp-backup-2026-04-03T10-15-30-000Z.zip
```

### Contents

The backup zip file contains:
- `scaleerp.db` — SQLite database file
- `scaleerp.db-wal` — WAL file (if exists)
- `scaleerp.db-shm` — SHM file (if exists)

## Backup History

All backup operations are logged to the `backup_history` table:

```sql
CREATE TABLE IF NOT EXISTS backup_history (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    type TEXT CHECK(type IN ('auto', 'manual', 'pre_operation', 'pre_restore')) NOT NULL,
    path TEXT NOT NULL,
    size_bytes INTEGER,
    success BOOLEAN DEFAULT 1,
    error_message TEXT,
    frequency_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Error Handling

### Backup Failures

```typescript
try {
  await backupScheduler.createBackup('auto');
} catch (error) {
  console.error('Backup failed:', error);
  
  // Log failure to history
  await logBackup({
    success: false,
    errorMessage: error.message
  });
  
  // Continue application operation
  // Backup failure should not crash the app
}
```

### Recovery

If a backup fails:
1. Error is logged to backup_history
2. Application continues normally
3. Next scheduled backup will attempt again
4. User can manually trigger backup

## Configuration

### Settings Storage

Backup settings are stored in the `backup_settings` table:

```sql
CREATE TABLE IF NOT EXISTS backup_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    auto_backup_enabled BOOLEAN DEFAULT 1,
    backup_frequency TEXT CHECK(backup_frequency IN ('daily', 'weekly', 'monthly')) DEFAULT 'weekly',
    backup_location TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Default Settings

```typescript
const defaultSettings = {
  autoBackupEnabled: true,
  backupFrequency: 'weekly',
  backupLocation: ''  // Must be configured by user
};
```

## Security Considerations

### File Permissions

- Backup files inherit directory permissions
- Recommended: Restrict backup directory to application user only

### Sensitive Data

- Database may contain sensitive business information
- Backup files should be stored securely
- Consider encryption for sensitive environments

## Performance

### Backup Impact

- Backup creation is I/O intensive
- Scheduled during low-usage hours (2:00 AM)
- Uses file system copy, not database dump
- Minimal impact on running application

### Storage Requirements

- Each backup is a full database copy
- Size depends on database content
- Retention policy manages disk usage

## Troubleshooting

### Common Issues

1. **Backup location not set**
   - Solution: Configure backup location in Settings

2. **Permission denied**
   - Solution: Ensure write permissions to backup directory

3. **Disk space full**
   - Solution: Clean old backups or increase disk space

4. **Scheduler not running**
   - Solution: Check if auto backup is enabled in settings

### Debug Logging

Enable detailed logging:

```typescript
console.log('Backup scheduler:', {
  enabled: settings.autoBackupEnabled,
  frequency: settings.backupFrequency,
  location: settings.backupLocation
});
```

## Related Documentation

- [Database Overview](../Database/database.md) — Database connection
- [Database Operations](../Database/operations.md) — CRUD operations
- [IPC Communication](../IPC/ipc-communication.md) — Frontend access
- [Settings Page](../../Frontend/Pages/pages.md#settings-page) — UI configuration