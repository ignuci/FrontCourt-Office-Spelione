# Setting up the answer sheet (one time, ~5 minutes)

Everyone's answers are saved in a Google Sheet that you own. You can open it any time to see, back up or fix answers.

1. Go to [sheets.new](https://sheets.new) and name the sheet, e.g. **Spėlionė answers**.
2. In the sheet, open **Extensions → Apps Script**.
3. Delete what's in `Code.gs`, paste in the whole of [`Code.gs`](./Code.gs) from this folder, and click **Save**.
4. In the function menu at the top choose **setup** and click **Run**. Google asks for permission — choose your account, then **Advanced → Go to … (unsafe) → Allow**. (It says "unsafe" because the script is yours and not reviewed by Google.) An **Answers** tab appears in the sheet.
5. Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).
7. Put that URL in `public/league.json` as `"sheetUrl"` (or send it to Claude to do it). The site starts saving as soon as that change is deployed.

## Good to know

- **Nothing is ever overwritten.** Each confirmed stage is one row: time, name, stage, answers. A second submission for the same person and stage is refused, so the first one is final.
- **Locks are enforced by the sheet too**, using the lock times in the site's `league.json`. Late submissions are refused.
- **Before a stage locks**, the site only shows *who* has submitted, not what they picked. After the lock, everyone's answers are visible.
- **To fix a mistake** (for example someone submitted under the wrong name), edit or delete that row in the sheet.
- **If you change `Code.gs` later**, use **Deploy → Manage deployments → Edit → Version: New version** so the URL stays the same.
- **Backups:** File → Download, or File → Version history in Google Sheets.
