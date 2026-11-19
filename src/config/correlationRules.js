
module.exports = [
    {
        id: 'RULE_T1110_BRUTE_FORCE',
        mitre: 'T1110',
        name: 'Brute Force Authentication Attempt',
        matchEvent: 'Auth_Failure',
        threshold: 5,
        windowMs: 2 * 60 * 1000, // 2 minutes
        severity: 'High',
        assignedTier: 'L1'
    },
    {
        id: 'RULE_T1059_001_POWERSHELL',
        mitre: 'T1059.001',
        name: 'Obfuscated or Suspicious PowerShell Execution',
        matchEvent: 'Process_Creation',
        matchPattern: /(-enc|-encodedcommand|downloadstring|iex\s*\(|-ep\s+bypass|-w\s+hidden)/i,
        threshold: 1, // Single-event trigger
        windowMs: 60 * 1000,
        severity: 'High',
        assignedTier: 'L2'
    },
    {
        id: 'RULE_T1046_PORT_SCAN',
        mitre: 'T1046',
        name: 'Internal Network Port Scan',
        matchEvent: 'Firewall_Deny',
        threshold: 10,
        windowMs: 60 * 1000, // 1 minute
        severity: 'Medium',
        assignedTier: 'L1'
    },
    {
        id: 'RULE_T1070_001_LOG_CLEAR',
        mitre: 'T1070.001',
        name: 'Windows Security Audit Log Cleared (Event 1102)',
        matchEvent: 'Audit_Log_Cleared',
        threshold: 1, // Immediate escalation
        windowMs: 60 * 1000,
        severity: 'Critical',
        assignedTier: 'L3'
    },
    {
        id: 'RULE_T1490_SHADOW_DELETE',
        mitre: 'T1490',
        name: 'Ransomware Prep: Volume Shadow Copy Deletion',
        matchEvent: 'Process_Creation',
        matchPattern: /(vssadmin\s+delete\s+shadows|wmic\s+shadowcopy\s+delete|bcdedit\s+\/set\s+\{default\}\s+recoveryenabled\s+no)/i,
        threshold: 1,
        windowMs: 60 * 1000,
        severity: 'Critical',
        assignedTier: 'L3'
    }
];