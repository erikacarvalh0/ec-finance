# Security design gate

Prototype only, no real financial accounts.

Before processing production data: authenticate users server-side, authorize each query using verified user identity, add cross-tenant tests, encrypt bank tokens, validate webhook signatures, support consent revocation and retention under LGPD, and implement audit logs, rate limits and monitoring.
