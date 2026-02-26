# Security Policy

## Introduction

The security of the Klira smart contract and protocol is our top priority. We are committed to ensuring the safety of our users' funds and the integrity of our protocol.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it to us as soon as possible. We encourage responsible disclosure and will work with you to ensure that the issue is addressed in a timely manner.

**Email**: security@klira.xyz

When reporting a vulnerability, please include:

- A detailed description of the vulnerability
- Steps to reproduce the vulnerability
- The potential impact and severity assessment
- Any proof-of-concept code (if applicable)

### Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 72 hours
- **Fix Timeline**: Depends on severity (Critical: 24-48h, High: 1 week, Medium: 2 weeks)

### Safe Harbor

We will not take legal action against security researchers who:
- Make a good faith effort to avoid privacy violations, data destruction, or service disruption
- Report the vulnerability to us before disclosing it publicly
- Allow reasonable time for us to address the issue before public disclosure

## Severity Classification

| Severity | Description | Example |
|----------|-------------|---------|
| Critical | Direct loss of user funds | Unauthorized withdrawal from vault |
| High | Potential loss of funds under specific conditions | Logic error exploitable with specific inputs |
| Medium | Protocol malfunction without direct fund loss | Incorrect fee calculation, DoS |
| Low | Minor issues | Informational, gas optimization |

## Security Audits

The Klira smart contract has not yet been audited by a third-party security firm. We are actively seeking a reputable Solana-specialized firm to conduct a comprehensive security audit. Once the audit is complete, we will publish the results here.

## Known Limitations

- The protocol uses a shared vault architecture where all user funds for each token are held in a single PDA. Security depends on Light Protocol's compressed state verification.
- Light Protocol infrastructure addresses are currently hardcoded. If Light Protocol migrates trees, the program must be redeployed.

## Contact

For security-related inquiries, please email security@klira.xyz.
