import type { Track } from "./types";

export const devopsTrack: Track = {
  id: "devops",
  title: "DevOps, Linux CLI & Cloud",
  blurb: "Command the terminal, write Bash, containerize with Docker, and ship behind Nginx.",
  numeral: "Ⅷ",
  optional: true,
  optionalWhy:
    "Six lessons of deployment and container practice. Essential for platform-adjacent roles, background literacy otherwise — and the vocabulary it teaches is a prerequisite for production debugging.",
  lessons: [
    {
      id: "bash-basics",
      title: "The Linux Filesystem & Essential Bash",
      minutes: 12,
      body: `Linux is a **tree rooted at \`/\`** — everything is a file: drives, devices, settings. You'll live in this tree, so learn to move fast.

\`\`\`
/            the root — everything hangs off it
├── home/    user folders (home/you)
├── etc/     system configuration (nginx.conf, ssh/)
├── var/     variable data — logs live in var/log
└── usr/     installed programs and libraries
\`\`\`

**Moving around:**
\`\`\`
pwd              # print working directory — where am I?
ls -la           # list all files, long form (permissions, sizes, dates)
cd /var/log      # absolute path — from the root
cd ..            # relative — up one level
cd ~             # home directory (~ = /home/you)
cd -             # jump to the previous directory
\`\`\`

**Reading and writing files:**
\`\`\`
cat app.log               # dump a whole file
less app.log              # page through a big one (q quits, / searches)
tail -f app.log           # follow a log live — your server's heartbeat
grep -rn "ERROR" .        # search recursively, show line numbers
head -20 data.csv         # first 20 lines (tail -20 for last)
\`\`\`

**Creating and moving:**
\`\`\`
mkdir -p projects/app     # -p creates missing parents in one shot
touch notes.md            # create an empty file (or update its timestamp)
cp a.txt backup/          # copy — cp -r dir/ other/ for folders
mv old.txt new.txt        # move AND rename — same command
rm file.txt               # delete a file; rm -r dir/ deletes folders
\`\`\`

**The golden rule of \`rm\`:** there is no trash can on a server. \`rm -rf /\` destroys the machine. Read the path twice, run once.

**The killer feature — pipes.** Commands stream text, so you chain them:
\`\`\`
cat access.log | grep "404" | wc -l        # how many 404s today?
ps aux | grep nginx | grep -v grep          # is nginx running?
history | grep ssh                           # what was that command I ran?
\`\`\`
\`|\` sends one command's output into the next one's input. Small tools, composed, beat one giant tool every time.`,
      starter: `// Servers don't have a mouse — navigation IS the job.
// Implement resolvePath(cwd, path): what "cd <path>" should do.

function resolvePath(cwd, path) {
  // "~" means home (/home/dev). Absolute paths start with "/".
  // Relative paths resolve against cwd. "." is here, ".." is up.
  let base;
  if (path === "~" || path.startsWith("~/")) {
    base = ["/home", "dev"];
    path = path.slice(1); // strip ~, leaving "" or "/..."
  } else if (path.startsWith("/")) {
    base = [];
  } else {
    base = cwd.split("/").filter(Boolean);
  }
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    // TODO: handle ".." (pop the last segment if any) and push normal parts
  }
  return "/" + base.join("/");
}

// --- test drive ---
const cases = [
  ["/home/dev", "projects",        "/home/dev/projects"],
  ["/home/dev", "..",              "/home"],
  ["/var/log",  "../lib",          "/var/lib"],
  ["/home/dev", "~/notes.txt",     "/home/dev/notes.txt"],
  ["/etc",      "/etc/nginx",      "/etc/nginx"],
  ["/home/dev", ".",               "/home/dev"],
];

let pass = 0;
for (const [cwd, input, want] of cases) {
  const got = resolvePath(cwd, input);
  const ok = got === want;
  if (ok) pass++;
  console.log((ok ? "PASS" : "FAIL") + " cd " + input + " → " + got + (ok ? "" : " (want " + want + ")"));
}
console.log(pass + "/6 correct");`,
      check: {
        expr: "output.includes('6/6 correct') && output.includes('PASS cd ~/notes.txt')",
        hint: "Inside the loop: if part === '..' pop from base (only if it has entries), otherwise push part. All six cases then pass.",
      },
      quiz: [
        {
          q: "You're in /var/log. Where does `cd ../lib` take you?",
          options: ["/var/lib", "/lib", "/var/log/lib", "/"],
          answer: 0,
          explanation: ".. climbs to /var, then into lib → /var/lib.",
        },
        {
          q: "`ls -la` shows a line starting with `-rw-r--r--`. What is it?",
          options: [
            "A directory",
            "A regular file with its permissions",
            "A hidden command",
            "A symlink",
          ],
          answer: 1,
          explanation: "Leading - = regular file (d = directory, l = symlink); rw-r--r-- is the permission triplets.",
        },
        {
          q: "Watch a log file update in real time with…",
          options: ["cat -w", "tail -f app.log", "less app.log", "grep -f app.log"],
          answer: 1,
          explanation: "tail -f follows the file as new lines land — the standard way to watch a server.",
        },
        {
          q: "Count ERROR lines in a log, the pipe way:",
          options: [
            "grep ERROR log | wc -l",
            "count log ERROR",
            "wc -l log > ERROR",
            "ls ERROR log",
          ],
          answer: 0,
          explanation: "grep filters the lines, wc -l counts them — pipes compose small tools.",
        },
        {
          q: "Why is `rm -rf` on a server feared?",
          options: [
            "It's slow",
            "It recursively deletes with no trash can — gone is gone",
            "It reboots the server",
            "It only affects the current file",
          ],
          answer: 1,
          explanation: "No undo exists. Read the path twice, run once.",
        },
      ],
    },
    {
      id: "bash-scripting",
      title: "Bash Scripting: Automate Everything Twice",
      minutes: 11,
      body: `If you typed a command twice, script it. A Bash script is just commands in a file — plus variables, conditionals, and loops.

\`\`\`
#!/usr/bin/env bash        # the shebang — run me with bash
set -euo pipefail          # die on error, undefined vars, pipe failures

BACKUP_DIR="/var/backups"  # no spaces around = in assignments!
STAMP=\$(date +%F)

mkdir -p "\$BACKUP_DIR/\$STAMP"
cp -r ./data "\$BACKUP_DIR/\$STAMP/"
echo "Backed up to \$BACKUP_DIR/\$STAMP"
\`\`\`

**The three lines at the top are a habit worth copying in every script:**
- \`-e\` — stop at the first failing command (don't keep building on rubble)
- \`-u\` — error on undefined variables (catches typos like \$BACKUP_Dir)
- \`-o pipefail\` — a pipe fails if ANY stage fails, not just the last

**Variables, conditionals, loops:**
\`\`\`
NAME="world"
echo "hello \$NAME"            # quotes matter: "$NAME" preserves spaces

if [ -f "config.yml" ]; then   # -f file exists, -d dir exists, -z empty string
  echo "found config"
elif [ -d "conf" ]; then
  echo "found dir"
else
  echo "nothing" >&2           # >&2 sends output to stderr
fi

for f in *.log; do             # glob loop
  gzip "\$f"
done

while read -r line; do         # stream a file line by line
  echo "line: \$line"
done < users.txt
\`\`\`

**Exit codes are the API:** \`0\` = success, anything else = failure. Commands (and CI pipelines) decide based on them. Your scripts should \`exit 1\` on failure and check \`\$?\` — the last command's exit code — when it matters.

**Cron schedules scripts:** \`crontab -e\`, then:
\`\`\`
0 2 * * *  /opt/scripts/backup.sh     # every day at 02:00
*/15 * * * * /opt/scripts/health.sh   # every 15 minutes
\`\`\`
Five fields: minute, hour, day-of-month, month, day-of-week.`,
      predict: [
        {
          prompt: "This script runs — what does it print?",
          lang: "bash",
          code: `set -e
echo "start"
ls /this/path/does/not/exist
echo "done"`,
          options: [
            "start, an error, and done",
            "start, then an error — done never prints because -e aborts",
            "Only done",
            "Nothing at all",
          ],
          answer: 1,
          explanation:
            "set -e aborts the script at the first failing command — that's its whole purpose.",
        },
        {
          prompt: "What does this loop print?",
          lang: "bash",
          code: `for f in a.txt b.txt; do
  echo "\$f"
done`,
          options: ["a.txt b.txt", "a.txt then b.txt, one per line", "$f twice", "Nothing"],
          answer: 1,
          explanation:
            "The for loop iterates the glob items — echo runs once per item. (Note: in real Bash, quotes around $f matter when filenames contain spaces.)",
        },
      ],
      quiz: [
        {
          q: "What does `set -euo pipefail` do?",
          options: [
            "Speeds the script up",
            "Makes the script fail fast: first error, undefined var, or pipe stage failure stops it",
            "Enables debug printing",
            "Runs the script in Docker",
          ],
          answer: 1,
          explanation: "The standard safety net for production Bash — fail fast, fail loud.",
        },
        {
          q: "In Bash, `X = 5` (with spaces) versus `X=5`:",
          options: [
            "Both assign 5",
            "With spaces, Bash tries to RUN a command named X — assignments need no spaces",
            "With spaces it's a comment",
            "X=5 is invalid",
          ],
          answer: 1,
          explanation: "Spaces turn an assignment into a command invocation — the classic Bash gotcha.",
        },
        {
          q: "An exit code of 0 means…",
          options: ["Failure", "Success", "Cancelled", "Nothing — it's ignored"],
          answer: 1,
          explanation: "Zero is success in shell convention; non-zero codes signal specific failures.",
        },
        {
          q: "`[ -f config.yml ]` tests whether…",
          options: [
            "The file is empty",
            "A regular file exists at that path",
            "The file is executable",
            "The folder exists",
          ],
          answer: 1,
          explanation: "-f = regular file exists (-d for directories, -z for empty strings).",
        },
        {
          q: "Cron line `*/15 * * * * job.sh` runs…",
          options: [
            "At 15:00 daily",
            "Every 15 minutes",
            "On the 15th of each month",
            "15 times per hour, randomly",
          ],
          answer: 1,
          explanation: "*/15 in the minute field = every 15th minute.",
        },
      ],
    },
    {
      id: "file-permissions",
      title: "File Permissions: chmod & chown",
      minutes: 10,
      body: `Every file carries **three permission triplets** — for the **owner**, the **group**, and **everyone else**:

\`\`\`
-rwxr-xr--  1 dev  team  4096  script.sh
 │├─┤├─┤├─┤
 │ │  │  └── others:      r--  read only
 │ │  └───── group:       r-x  read + execute
 │ └──────── owner:       rwx  read + write + execute
 └────────── file type:   - file, d directory
\`\`\`

- **r (4)** — read: see a file's contents / list a directory
- **w (2)** — write: modify a file / create+delete in a directory
- **x (1)** — execute: run a file / enter a directory

**That's why chmod uses numbers** — each triplet is a sum:

\`\`\`
7 = 4+2+1  rwx     6 = 4+2   rw-     5 = 4+1  r-x
4 = r--            3 = -wx            1 = --x

chmod 755 deploy.sh     # rwxr-xr-x — I do everything, others read/run
chmod 644 .env.example  # rw-r--r--  — I edit, world reads
chmod 600 ~/.ssh/id_ed25519   # rw-------  — ONLY I may read (SSH demands this)
chmod +x script.sh      # add execute for everyone — quick form
\`\`\`

**Ownership:** \`chown deploy:www data/\` changes owner to user \`deploy\` and group \`www\` (needs sudo for other people's files). Web servers typically run as \`www-data\` or \`nginx\` — if your app can't read a file, \`ls -l\` is the first place to look.

**The classic production bug:** SSH *refuses* your private key if it's group-readable — the fix is \`chmod 600\`. And a deploy script that won't run usually just needs \`chmod +x\`.

**Minimum privilege is the rule:** give every service the least permission it needs — 644 for files the world may read, 600 for secrets, 755 for scripts and directories others must traverse.`,
      starter: `// Decode permission triplets like the shell does.
// canAccess("rwxr-x---", role) → can role do the action?

function canAccess(perms, role, action) {
  // perms: 9 chars, e.g. "rwxr-x---"
  // role:  "owner" | "group" | "other"
  // action: "read" | "write" | "execute"
  const triplets = { owner: 0, group: 3, other: 6 };
  const mask = { read: "r", write: "w", execute: "x" };
  // TODO: pick the right triplet, then check whether
  // it contains the letter for the action
}

console.log("owner write  rwxr-x--- :", canAccess("rwxr-x---", "owner", "write"));   // true
console.log("group execute r-x      :", canAccess("r-x", "group", "execute") );      // works per index too
console.log("other read   rwxr-x--- :", canAccess("rwxr-x---", "other", "read"));    // false
console.log("group write  rw-r----- :", canAccess("rw-r-----", "group", "write"));   // false
console.log("other execute r-x      :", canAccess("r-x", "other", "execute"));      // hmm — index 6 in a 3-char string?
// TODO: make all five lines behave sensibly (the last two use a bare triplet)`,
      check: {
        expr:
          "output.includes('owner write  rwxr-x--- : true') && output.includes('group write  rw-r----- : false')",
        hint: "perms[triplets[role]] picks the triplet; then check perms.at(index).includes(mask[action]) — but guard: if the perms string is only 3 chars, treat it as the triplet itself.",
      },
      quiz: [
        {
          q: "`chmod 755` on a script gives:",
          options: [
            "rwx------",
            "rwxr-xr-x — owner full, everyone else read+execute",
            "rw-r--r--",
            "rwxrwxrwx — everyone everything",
          ],
          answer: 1,
          explanation: "7=rwx, 5=r-x, 5=r-x — the standard script/deploy permission.",
        },
        {
          q: "SSH rejects your private key. The usual fix:",
          options: [
            "chmod 777 the key",
            "chmod 600 the key — only the owner may read it",
            "chown the key to root",
            "Rename the key",
          ],
          answer: 1,
          explanation: "SSH refuses group/world-readable private keys — 600 is required.",
        },
        {
          q: "The three permission triplets are for:",
          options: [
            "admin, user, guest",
            "owner, group, others",
            "read, write, run",
            "root, sudo, wheel",
          ],
          answer: 1,
          explanation: "User (owner), group, and other — checked in that order, first match wins.",
        },
        {
          q: "Why is `x` on a DIRECTORY about entering?",
          options: [
            "Directories execute programs",
            "x (search) permission lets you cd into it and access its entries",
            "It's a historical accident",
            "x on directories means delete",
          ],
          answer: 1,
          explanation: "For directories, execute = traverse: enter the dir and reach files inside.",
        },
        {
          q: "Numeric value of rw- ?",
          options: ["5", "6", "7", "3"],
          answer: 1,
          explanation: "read(4) + write(2) = 6 — no execute bit.",
        },
      ],
    },
    {
      id: "processes-services",
      title: "Processes, systemd & Server Hygiene",
      minutes: 10,
      reading: true,
      body: `A Linux server runs hundreds of **processes**. Managing them is daily DevOps life.

**Watching processes:**
\`\`\`
ps aux                    # snapshot of every process
ps aux | grep node        # find your app
top                       # live view — CPU/RAM per process
htop                      # top, but humane (F9 kill, / search)
kill 4821                 # polite stop (SIGTERM) by PID
kill -9 4821              # force kill (SIGKILL) — last resort
pkill -f "node server"    # kill by name/pattern
\`\`\`

**Ports — who's listening?**
\`\`\`
ss -tlnp                  # listening TCP sockets + owning process
curl -I localhost:3000    # is my app actually answering?
lsof -i :3000             # what holds port 3000 (EADDRINUSE!)
\`\`\`

**systemd — services that survive reboots.** You don't want to SSH in and start your app by hand after every crash. A unit file at \`/etc/systemd/system/myapp.service\`:

\`\`\`
[Unit]
Description=My Node app
After=network.target

[Service]
User=deploy
WorkingDirectory=/srv/myapp
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
\`\`\`

\`\`\`
sudo systemctl daemon-reload      # after editing unit files
sudo systemctl enable myapp       # start on boot
sudo systemctl start myapp
systemctl status myapp            # running? crashed? since when?
journalctl -u myapp -f            # the app's logs, live
journalctl -u myapp --since "1 hour ago"
\`\`\`

**Disk & memory hygiene** — servers die of full disks more often than full CPUs:
\`\`\`
df -h                     # disk space per mount (look for 100%)
du -sh *                  # what's eating space here (summarized)
free -h                   # RAM and swap
\`\`\`

**Logs rotate** via logrotate so they don't eat the disk; \`journalctl --vacuum-time=30d\` trims old journal entries. Check \`df -h\` before you check anything else when a server "feels slow" — a 100% disk freezes even healthy software.`,
      quiz: [
        {
          q: "Your app says EADDRINUSE :3000. Find the culprit with:",
          options: ["ps aux | grep 3000", "lsof -i :3000 or ss -tlnp", "df -h", "top"],
          answer: 1,
          explanation: "Both list the process holding the port — kill it or reconfigure.",
        },
        {
          q: "`systemctl enable myapp` does what?",
          options: [
            "Starts it now",
            "Starts it automatically on boot",
            "Restarts it on crash",
            "Enables debug logs",
          ],
          answer: 1,
          explanation: "enable = boot autostart; start = now; Restart=always in the unit file handles crashes.",
        },
        {
          q: "Live logs for the myapp systemd service:",
          options: [
            "cat /var/log/syslog",
            "journalctl -u myapp -f",
            "tail myapp.log",
            "systemctl logs myapp",
          ],
          answer: 1,
          explanation: "journalctl reads the systemd journal; -u filters by unit, -f follows.",
        },
        {
          q: "kill versus kill -9:",
          options: [
            "Identical",
            "-9 (SIGKILL) can't be caught or cleaned up — try plain kill (SIGTERM) first",
            "kill only works on your own processes",
            "-9 is a dry run",
          ],
          answer: 1,
          explanation: "SIGTERM lets the app flush state and shut down cleanly; SIGKILL is the axe.",
        },
        {
          q: "A server freezes randomly. First check:",
          options: ["df -h — a full disk stalls everything", "Reboot", "Reinstall", "htop only"],
          answer: 0,
          explanation: "100% disk usage is the most common cause of 'healthy' software turning unresponsive.",
        },
      ],
    },
    {
      id: "docker-dockerfile",
      title: "Docker: Package It Once, Run It Anywhere",
      minutes: 14,
      reading: true,
      predict: [
        {
          prompt: "Two Dockerfiles build the same app. Why is the first rebuilt-from-scratch slow on every code change?",
          code: `# A
COPY . .
RUN npm install

# B
COPY package.json .
RUN npm install
COPY . .`,
          options: [
            "A is invalid syntax",
            "A's npm install layer invalidates when ANY file changes — B only reinstalls when package.json changes",
            "B downloads more",
            "They're equally fast",
          ],
          answer: 1,
          explanation:
            "Layers cache by input. Copying everything first means every edit busts the npm install layer — the single most common Dockerfile mistake.",
        },
      ],
      body: `**A Docker image packages your app + its runtime + its dependencies into one immutable artifact.** The same image runs identically on your laptop, CI, and production — "works on my machine" dies here.

**Image vs container:** an image is the frozen template; a container is a running instance of it.

\`\`\`Dockerfile
FROM node:20-alpine          # start from a tiny official base
WORKDIR /app

COPY package*.json ./        # dependencies manifest FIRST…
RUN npm ci --omit=dev        # …so npm ci caches until it changes

COPY . .                     # then your code
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000                  # documentation — the port the app listens on
USER node                    # never run as root

CMD ["node", "server.js"]    # the process the container runs
\`\`\`

\`\`\`
docker build -t myapp:1.0 .            # build from the Dockerfile
docker run -p 3000:3000 myapp:1.0      # run, mapping host:container ports
docker run -e API_KEY=xyz myapp:1.0    # inject env at RUNTIME, never bake secrets in
docker ps                              # running containers
docker logs -f <id>                    # follow a container's logs
docker exec -it <id> sh                # shell into a running container
docker compose up -d                   # run the whole stack below
\`\`\`

**Layer caching is the performance model.** Each instruction is a layer; Docker reuses cached layers until an instruction's inputs change. That's why \`COPY package*.json\` + \`npm ci\` comes **before** \`COPY . .\` — code edits then skip reinstalling dependencies.

**docker-compose.yml — multi-container apps in one file:**
\`\`\`yaml
services:
  web:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgres://app:secret@db:5432/app
    depends_on: [db]
  db:
    image: postgres:16
    volumes: [pgdata:/var/lib/postgresql/data]
volumes:
  pgdata:
\`\`\`
Containers on the same compose network reach each other **by service name** — the web app connects to host \`db\`. Volumes keep database data alive across restarts.

**Production rules of thumb:** pin base image versions (\`node:20-alpine\`, never \`latest\`), one process per container, \`.dockerignore\` node_modules, and store secrets in env vars or a secrets manager — never in a layer (layers are forever, even "deleted" ones).`,
      quiz: [
        {
          q: "Image vs container:",
          options: [
            "Same thing",
            "An image is the built template; a container is a running instance of it",
            "A container builds images",
            "Images run only on Linux",
          ],
          answer: 1,
          explanation: "Class : object, image : container.",
        },
        {
          q: "Why COPY package.json before COPY . . ?",
          options: [
            "Alphabetical order",
            "So the dependency-install layer caches and survives code-only changes",
            "npm requires it",
            "It reduces image size",
          ],
          answer: 1,
          explanation: "Layer caching: dependency layers bust only when the manifest changes.",
        },
        {
          q: "Secrets belong:",
          options: [
            "In a RUN line baked into the image",
            "In ENV inside the Dockerfile",
            "Injected at runtime via -e / orchestrator secrets",
            "In a layers/ folder",
          ],
          answer: 2,
          explanation: "Image layers are permanent and inspectable — runtime env or a secrets manager only.",
        },
        {
          q: "In compose, the web service reaches Postgres at host:",
          options: ["localhost", "db — the service name resolves on the compose network", "0.0.0.0", "postgres://host.docker.internal"],
          answer: 1,
          explanation: "Compose DNS registers each service name — 'db' is the hostname.",
        },
        {
          q: "Why pin node:20-alpine instead of node:latest?",
          options: [
            "Alpine is prettier",
            "latest silently changes under you — builds become non-reproducible",
            "latest doesn't exist",
            "Smaller name",
          ],
          answer: 1,
          explanation: "Pinned versions make builds reproducible; 'latest' is a moving target.",
        },
      ],
    },
    {
      id: "nginx-ssl-ci",
      title: "Nginx, HTTPS & CI/CD Pipelines",
      minutes: 12,
      reading: true,
      body: `**Nginx sits in front of your app** — serving static files fast, terminating TLS, and reverse-proxying API traffic:

\`\`\`nginx
server {
    listen 80;
    server_name example.com www.example.com;

    # ACME challenge must stay reachable BEFORE https exists
    location /.well-known/acme-challenge/ { root /var/www/certbot; }

    location / { return 301 https://\$host\$request_uri; }   # force HTTPS
}

server {
    listen 443 ssl;
    http2 on;
    server_name example.com;

    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Security headers — cheap, high value
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff always;

    location / {
        proxy_pass http://127.0.0.1:3000;            # your app
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;      # real client IP
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
\`\`\`

**HTTPS for free with Let's Encrypt + certbot:**
\`\`\`
sudo certbot --nginx -d example.com -d www.example.com
# certbot edits your config and installs a systemd timer to auto-renew
sudo certbot renew --dry-run      # prove renewal works before you need it
\`\`\`
Certificates last ~90 days by design — automation isn't optional, it's the model. **DNS first:** an \`A\` record pointing example.com at your server's IP must exist before certbot will issue anything.

**CI/CD — the pipeline that ships on every merge:**
\`\`\`yaml
# .github/workflows/deploy.yml
name: deploy
on:
  push: { branches: [main] }
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm test            # red build never ships
      - run: npm run build
      - name: Deploy over SSH
        if: success()
        run: |
          ssh deploy@server "cd /srv/app && git pull && ./deploy.sh"
\`\`\`

The pattern that matters: **main is always deployable, and the pipeline — not a person — ships it.** Tests gate the build; the build gates the deploy. Rollback = redeploy the previous tag. That's the whole philosophy.`,
      quiz: [
        {
          q: "A reverse proxy like Nginx in front of your app gives you:",
          options: [
            "Only static files",
            "TLS termination, static file serving, and proxying to your app process",
            "A database cache",
            "DNS registration",
          ],
          answer: 1,
          explanation: "It fronts the app: HTTPS, compression, caching, routing — the app just speaks HTTP.",
        },
        {
          q: "Before certbot can issue a certificate you need:",
          options: [
            "A paid certificate",
            "DNS records pointing the domain at your server",
            "Docker installed",
            "Port 25 open",
          ],
          answer: 1,
          explanation: "Let's Encrypt verifies domain control — the A record must resolve first.",
        },
        {
          q: "Let's Encrypt certificates last 90 days because:",
          options: [
            "They're insecure",
            "Short-lived certs assume automated renewal — the model is machines, not memory",
            "Users complain",
            "It matches billing",
          ],
          answer: 1,
          explanation: "Automation replaces calendar anxiety — certbot renews on a timer.",
        },
        {
          q: "Why run `npm test` in the deploy pipeline?",
          options: [
            "Tradition",
            "A failing test blocks the deploy — broken code never reaches users",
            "It speeds up the build",
            "GitHub requires it",
          ],
          answer: 1,
          explanation: "The pipeline is the quality gate: red means no ship.",
        },
        {
          q: "`X-Real-IP` / `X-Forwarded-Proto` headers exist so that:",
          options: [
            "The app can style itself",
            "The app behind the proxy still sees the real client IP and protocol",
            "Nginx can log faster",
            "Browsers verify the proxy",
          ],
          answer: 1,
          explanation: "Once Nginx proxies, the app sees the proxy — these headers carry the client truth.",
        },
      ],
    },
  ],
};
