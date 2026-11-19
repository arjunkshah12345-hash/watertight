# Watertight: Boat Hackathon SF 2026 submission

**Track:** Best private AI build (NY Token Exchange + LetsEncrypt.AI)
**Site:** https://arjunkshah12345-hash.github.io/watertight/
**Code:** https://github.com/arjunkshah12345-hash/watertight
**Demo video:** `video/out/watertight-demo.mp4` (upload to the submission form / X)

## One line

A private AI data room: investors ask anything about a startup's numbers, sealed details never reach the model, and the founder can sink access in one click.

## The problem

Founders upload their most sensitive files (customer lists, payroll, cap table) to data rooms, and investors now paste those files into AI chat to do diligence. Each paste sends the room to a model provider that nobody in the deal can audit. An NDA only tells you what happens after the leak.

## What Watertight does

1. **The founder seals categories.** Customer identities, named people, individual salaries and cap-table holders are sealed by default. Customers become stable pseudonyms (`C-07`), salaries collapse to department totals (only for groups of three or more), and holders collapse to share-class totals.
2. **The investor asks in plain English.** Questions that target a sealed category are refused inside the room, so nothing is sent. Allowed questions go to GLM 5.3 Flash over **attested confidential inference** (`min_privacy: "confidential"`, which fails closed), with the room already redacted.
3. **Every byte that leaves is listed.** The "What left the room" pane shows each outbound payload. Each one is scanned against every sealed literal (133 in the demo room), and the count shown is always 0. Answers that contain a sealed value are blocked too.
4. **Claims get checked against the data.** "Check the deck" compares the pitch deck with the actual files. In the demo, the deck says 40+ customers, $4.2M ARR and 131% NRR, and the data says 21, $3.07M and 91.6%. Public claims are checked through Context.dev search after an egress filter strips private values from the query.
5. **Anyone can verify the hull.** A fresh nonce goes to the gateway's `/attestation` endpoint. The returned Google Confidential Space JWT is verified against Google's JWKS. The checks confirm the nonce, Intel TDX, debug disabled since boot, and the image digest. On the landing site this runs **in the visitor's browser**, with no Watertight server involved.
6. **Revoke.** One click kills the deal's process, zeroes its 32-byte key and shreds the encrypted files. The investor's next question gets a 410.

## Sponsor tech

| Sponsor | How it's used |
|---|---|
| **NY Token Exchange / TrustedRouter** | All inference goes through `api.confidential.nytokenexchange.com` with `provider.min_privacy: "confidential"`. The `/attestation` endpoint powers "Verify the hull" in the app and on the site. |
| **GLM 5.3 Flash** | The model that answers investors' questions and checks the deck. |
| **Context.dev** | Web search for public claims, with sealed values stripped from queries first. |
| **Boat.dev** | The production target for per-deal compartments (one VM per deal). The demo uses one OS process per deal. |

## Honest scope (say this before a judge asks)

- Attestation proves the gateway handling our prompts runs the stated image on confidential hardware. Provider-side confidentiality comes from TrustedRouter's `confidential` routing floor. We do not encrypt prompts on the client. The claim is **"attested confidential inference."**
- Compartments are local processes in the demo. Boat.dev VMs are the production plan.
- Halyard, the demo company, and all of its data are synthetic.

## 3-minute demo script

| Time | On screen | Say |
|---|---|---|
| 0:00 | Landing site hero | "Investors now paste data rooms into chatbots. Watertight is a data room where AI diligence can't leak." |
| 0:20 | Site → Verify the hull (click "Re-inspect with a new nonce") | "Don't trust us. My browser just sent a fresh nonce to the confidential gateway, got back a token signed by Google, and checked it. Eight of eight. No server of ours was involved." |
| 0:45 | App (`npm start`), founder pane | "Halyard's founder uploads the room. Customers, salaries and the cap table are sealed. Each deal gets its own key and its own process." |
| 1:05 | Investor asks "Who are the top 5 customers?" | "Refused inside the room. Zero bytes left. Look at the right pane." |
| 1:20 | Investor asks "What's net revenue retention?" | "This one is allowed. It goes to GLM over confidential inference: 91.6%. The deck said 131%. The leak scan says 0 of 133 sealed values went out, and you can open the exact payload." |
| 1:50 | Click "Check the deck" | "Three of the deck's claims don't hold up against its own data. That's the diligence an investor actually wants." |
| 2:15 | Founder clicks Revoke | "The founder sinks access: process killed, key zeroed, files shredded." |
| 2:30 | Investor asks again → 410 | "Nothing left to read. Share the answers, keep the room." |

Fallbacks:
- No API key or the app won't start: run the 0:45–2:30 beats on the site's **Try the room** section instead. It plays the same refuse → answer → revoke → 410 flow with replies captured from the app.
- Network drops: the app runs in **offline rehearsal** mode with canned answers and no network calls. Hull verification still needs internet access.

## Eligibility checklist

- [ ] Make a commit **from aboard the boat** (Historic Klamath, Pier 9) and push it.
- [ ] Post a photo on X with **#boathackathon**, tagging **@boathackathon** and **@teamily** (draft below).
- [ ] Add `TRUSTEDROUTER_API_KEY` (and optionally `CONTEXT_DEV_API_KEY`) to `.env`, then run one live question before demoing.
- [ ] Submit before **Thu Nov 20, 5:00 PM PT**.

## X post draft (attach a photo from the boat)

> Built Watertight aboard the Historic Klamath at #boathackathon 🚢
>
> A private AI data room: investors can ask anything, sealed data never reaches the model, and founders revoke access in one click. Every answer runs on attested confidential inference through NY Token Exchange, verified from your own browser.
>
> https://arjunkshah12345-hash.github.io/watertight/
>
> @boathackathon @teamily
