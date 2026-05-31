import { Router } from "express";
import { backupFilename, createBackupArchive } from "../lib/backupExport.js";

export const backupRouter = Router();

backupRouter.get("/export", async (_req, res) => {
  try {
    const filename = backupFilename();
    const archive = await createBackupArchive();

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    archive.on("error", (err) => {
      console.error(err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to create backup" });
      } else {
        res.end();
      }
    });

    archive.pipe(res);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to export backup" });
  }
});
