# Imported card credits and refund breakdown

The invoice page separates positive recorded purchases from negative imported card transactions, which are displayed as credits or refunds. This is a sign-based classification: it does not claim that a bank has confirmed a refund, or identify the original purchase being refunded.

The existing signed invoice total remains the authoritative calculated total. The breakdown uses exact bigint cents, without adding a credit a second time. Only imported negative transactions are classified as credits; manual negative expense entries are not supported by this summary.

A credit larger than the purchases can produce a negative invoice total. The existing payment service continues to determine payment status and balance. Provider-specific refund matching, fee handling, manual refund entry, and settlement confirmation are follow-up work.
