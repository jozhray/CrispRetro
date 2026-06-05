const fs = require('fs');
const { execSync } = require('child_process');

try {
    const content = fs.readFileSync('.env', 'utf8');
    const lines = content.split('\n');

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;

        const match = trimmedLine.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();

            console.log(`Setting ${key}...`);
            // Use child_process.spawn or exec with input to avoid shell mangling
            // On Windows, can't easily use echo without newlines, so we'll use a temp file or stdin
            try {
                // First remove existing if any to be sure
                execSync(`vercel env rm ${key} production --yes`, { stdio: 'ignore' });
            } catch (e) { }

            const cmd = `printf "${value}" | vercel env add ${key} production`;
            // Windows doesn't have printf by default, let's use node to write the value to stdin
            const addProcess = require('child_process').spawn('vercel', ['env', 'add', key, 'production']);
            addProcess.stdin.write(value);
            addProcess.stdin.end();

            // Wait for it to finish (simplified)
            execSync(`timeout /t 2 > nul`);
        }
    }
} catch (error) {
    console.error('Error:', error);
}
