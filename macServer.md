# Ollama Server Installation Specification
## MacBook Pro 2020 → Arch Linux Bare-Bones Server

---

## Hardware Specifications
- **Model**: MacBook Pro 2020 (Intel)
- **CPU**: Intel i9
- **RAM**: 32GB
- **GPU**: 1526MB (Intel integrated)
- **Storage**: 1TB SSD
- **Screen**: Broken (will use external temporarily, then headless)

---

## Installation Requirements

### 1. Network & Access
| Question | Answer |
|----------|--------|
| WiFi needed during install? | ✅ YES |
| SSH access only after setup? | ✅ YES (headless server) |
| Remote access from? | 🌐 Internet (not just local network) |

### 2. System Configuration
| Question | Answer |
|----------|--------|
| Timezone | 🦘 Australia/Sydney |
| Username | `mind` |
| Hostname | `im-server` |
| Swap partition/file | ❌ NO (maximize RAM for Ollama) |

### 3. Disk Setup
| Question | Answer | Notes |
|----------|--------|-------|
| Wipe macOS completely? | ⚠️ **NEEDS CONFIRMATION** | Irreversible - backup important data first! |
| Partition scheme | **Simple: EFI + Root** | Recommended for ease of use |
| - EFI Partition | 512MB | Boot partition |
| - Root Partition | ~999GB | Everything else (/, /home, /var, etc.) |

**Recommendation**: Simple 2-partition scheme is perfect for a server. No need to separate /home since you're the only user.

### 4. Security Setup
| Feature | Status | Details |
|---------|--------|---------|
| SSH key-based authentication | ✅ Enabled | More secure than passwords |
| Password SSH login | ⚠️ **Question: Disable completely or allow as backup?** | Recommend: Allow initially, disable later |
| Firewall (UFW) | ✅ Enabled | Only SSH (22) and Ollama (11434) ports open |
| Automatic security updates | ✅ Enabled | Using systemd timer |
| Fail2ban | ❓ **Should we install?** | Blocks brute-force SSH attempts |
| Root login via SSH | ❌ Disabled | Standard security practice |

### 5. Software & Features
| Feature | Status | Notes |
|---------|--------|-------|
| Docker | ✅ Install | For containerized apps |
| Docker Compose | ✅ Install | Easier container management |
| Monitoring tools | ✅ Install | htop, btop, netdata |
| Ollama | ✅ Install | Latest version from official source |
| Auto-start Ollama on boot | ✅ Enabled | systemd service |
| Ollama Web UI | ❌ No | Command-line/API only |
| Pre-installed models | ⏸️ TBD | Will add manually later |

---

## Additional Questions Needed

### 🔴 CRITICAL - T2 Chip Compatibility
**MacBook Pro 2020 may have Apple T2 security chip**

| Question | Answer | Impact |
|----------|--------|--------|
| Does your MacBook have Touch ID? | ❓ **PLEASE CONFIRM** | If YES → has T2 chip → may need special drivers |
| If T2 chip present, OK with potential issues? | ❓ | Keyboard/touchpad may not work, need external USB |
| Have external USB keyboard/mouse available? | ❓ | Required if T2 causes issues |

### 🟡 Pre-Installation Preparation
| Question | Answer |
|----------|--------|
| Have you backed up any important data from macOS? | ❓ |
| Do you have the WiFi network name (SSID)? | ❓ |
| Do you have the WiFi password? | ❓ |
| Do you have another computer to SSH from? | ❓ |
| What OS is on your other computer? | ❓ (for SSH key generation instructions) |

### 🟡 Network Configuration
| Question | Answer | Notes |
|----------|--------|-------|
| Static IP or DHCP? | ❓ **Recommend: Static IP** | Easier for SSH access |
| If static, what IP should we use? | ❓ | e.g., 192.168.1.100 |
| Router/gateway IP? | ❓ | e.g., 192.168.1.1 |
| DNS servers to use? | ❓ **Recommend: 1.1.1.1, 8.8.8.8** | Cloudflare & Google |

### 🟡 SSH Security Options
| Question | Default Recommendation | Alternative |
|----------|----------------------|------------|
| SSH port | 22 (standard) | Custom port (e.g., 2222) for security through obscurity? |
| Allow password auth initially? | YES (disable after key setup) | NO (keys only from start)? |
| Install fail2ban? | YES (recommended for internet access) | Skip if you prefer manual management? |
| SSH timeout? | 10 minutes | Different preference? |

### 🟡 Additional Packages
**Optional but useful packages - which do you want?**

| Package | Purpose | Install? |
|---------|---------|----------|
| `tmux` | Terminal multiplexer (multiple sessions) | ❓ Recommended |
| `screen` | Alternative to tmux | ❓ |
| `vim` | Text editor | ✅ (default) |
| `nano` | Simpler text editor | ❓ |
| `git` | Version control | ❓ Recommended |
| `wget` | Download tool | ❓ |
| `curl` | Download/API tool | ✅ (needed for Ollama) |
| `btop` | Better system monitor | ✅ (confirmed) |
| `neofetch` | System info display | ❓ |
| `ncdu` | Disk usage analyzer | ❓ Recommended |
| `rsync` | File sync tool | ❓ |
| `unzip`/`zip` | Archive tools | ❓ |
| `python3` | Python programming | ❓ |
| `nodejs`/`npm` | JavaScript runtime | ❓ |

### 🟢 WiFi Driver Clarification
**MacBook Pro 2020 WiFi chipset varies by model**

| Question | Answer | Why it matters |
|----------|--------|----------------|
| WiFi works in macOS recovery mode? | ❓ | Indicates hardware functional |
| Do you know your WiFi card model? | ❓ | Check: Apple Menu → About This Mac → System Report → Network → WiFi |
| Willing to use USB WiFi adapter if needed? | ❓ | Backup plan if builtin doesn't work |

### 🟢 Internet Exposure Plan
**You mentioned internet access - security implications**

| Question | Answer | Notes |
|----------|--------|-------|
| Will you use dynamic DNS? | ❓ | For consistent domain name if IP changes |
| Port forwarding on router? | ❓ | Will you set this up yourself? |
| VPN for access instead? | ❓ | More secure than direct exposure |
| Cloudflare Tunnel? | ❓ | Alternative to port forwarding |

### 🟢 Disk Encryption
| Question | Answer | Notes |
|----------|--------|-------|
| Full disk encryption (LUKS)? | ❓ **Your choice** | Pro: Secure if stolen. Con: Must enter password on boot (can't fully autostart) |

### 🟢 Monitoring & Alerts
| Question | Answer |
|----------|--------|
| Want email alerts for system issues? | ❓ |
| Want uptime monitoring? | ❓ |
| Install netdata web dashboard? | ❓ (access via http://ip:19999) |

---

## Installation Timeline Estimate

**Assuming all prerequisites are met:**

| Phase | Estimated Time | What Happens |
|-------|---------------|--------------|
| Pre-install checks | 10 minutes | Run verification script, backup check |
| Create bootable USB | 15 minutes | Download ISO, write to USB |
| Boot and WiFi setup | 10 minutes | Boot from USB, connect to WiFi |
| Partitioning & formatting | 5 minutes | Automated via script |
| Base system install | 15-20 minutes | Install core packages |
| Configuration | 10 minutes | Timezone, users, hostname |
| Package installation | 20-30 minutes | Docker, monitoring, security tools |
| Ollama installation | 5-10 minutes | Install and configure |
| Security hardening | 10 minutes | SSH keys, firewall, fail2ban |
| Testing & verification | 10 minutes | Ensure everything works |
| **TOTAL** | **~2 hours** | Including troubleshooting buffer |

---

## Recommended Installation Approach

### Phase 1: Preparation (Do Before Wiping)
1. ✅ Answer all red/yellow questions above
2. ✅ Backup any important data from macOS
3. ✅ Gather WiFi credentials
4. ✅ Create bootable USB from another computer
5. ✅ Generate SSH key on your client computer
6. ✅ Test external monitor/keyboard/mouse

### Phase 2: Installation (Day 1)
1. Boot from USB with external monitor/keyboard
2. Run automated installation script
3. Configure network and SSH
4. Test SSH access from another computer
5. **Disconnect external monitor/keyboard** (go headless)

### Phase 3: Configuration (Day 1-2)
1. Via SSH: Install additional packages
2. Pull Ollama models you want
3. Test Ollama functionality
4. Set up monitoring
5. Configure firewall rules for internet access

### Phase 4: Hardening (Day 2)
1. Disable password SSH authentication
2. Set up port forwarding or VPN
3. Enable fail2ban
4. Test remote access from internet
5. Set up backups/snapshots

---

## Script Outputs

After you answer the remaining questions, I will create:

### 📄 `installation-guide.md`
Complete step-by-step manual instructions (if you want to understand each step)

### 📄 `pre-install-check.sh`
Verification script to run before installation:
- Checks hardware compatibility
- Verifies WiFi chipset
- Confirms backups
- Tests USB creation
- Validates all prerequisites

### 📄 `arch-ollama-install.sh`
Main automated installer:
- Partitions disk (with confirmation)
- Installs base system
- Configures all settings
- Installs all packages
- Sets up security
- Configures Ollama
- Tests everything

### 📄 `post-install-setup.sh`
Run after first boot via SSH:
- Final configurations
- SSH key setup
- Additional hardening
- Monitoring setup

### 📄 `ssh-setup-guide.md`
Instructions for:
- Generating SSH keys on your client
- Copying public key to server
- Configuring SSH client
- Disabling password auth

### 📄 `ollama-usage-guide.md`
Quick reference for:
- Pulling models
- Running models
- API usage
- Memory management
- Troubleshooting

### 📄 `maintenance-guide.md`
Ongoing maintenance:
- System updates
- Monitoring
- Backups
- Security checks
- Log management

---

## Next Steps

**Please answer the ❓ questions above, especially:**
1. 🔴 **Do you have Touch ID?** (T2 chip check)
2. 🟡 **WiFi network name and password**
3. 🟡 **Static IP preference** (recommended)
4. 🟡 **What OS is your other computer?** (for SSH key instructions)
5. ⚠️ **CONFIRM: You've backed up any important data**

Once you provide these answers, I'll generate all the scripts and documentation customized for your setup!

---

## Questions?

Feel free to ask about:
- Any technical terms you're unsure about
- Why certain choices are recommended
- Alternative approaches
- Specific security concerns
- Hardware compatibility worries

**No question is too basic - let's get this right!** 🚀
