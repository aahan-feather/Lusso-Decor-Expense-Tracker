import { Router } from "express";
import multer from "multer";
import { backupFilename, createBackupArchive } from "../lib/backupExport.js";
import { importBackupFromZip } from "../lib/backupImport.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

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

backupRouter.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.buffer?.length) {
      res.status(400).json({ error: "No backup file uploaded" });
      return;
    }
    const result = await importBackupFromZip(req.file.buffer);
    res.json(result);
  } catch (e) {
    console.error(e);
    const message = e instanceof Error ? e.message : "Failed to import backup";
    res.status(400).json({ error: message });
  }
});
