import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { execFile, exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, "../../../uploads");

// Ensure uploads directory exists
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const router = Router();

// Multer setup — store raw upload with original extension
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${id}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".glb", ".gltf", ".fbx"];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported format: ${ext}. Allowed: GLB, GLTF, FBX`));
    }
  },
});

interface ModelMeta {
  id: string;
  name: string;
  originalName: string;
  originalFormat: string;
  outputFormat: string;
  outputFile: string;
  size: number;
  uploadedAt: string;
  status: "ready" | "converting" | "error";
  error?: string;
}

// Simple JSON file as a tiny database
const DB_PATH = path.join(UPLOADS_DIR, "models.json");

function readDb(): ModelMeta[] {
  try {
    if (!fs.existsSync(DB_PATH)) return [];
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function writeDb(models: ModelMeta[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(models, null, 2));
}

function addOrUpdate(model: ModelMeta) {
  const models = readDb();
  const idx = models.findIndex(m => m.id === model.id);
  if (idx >= 0) models[idx] = model;
  else models.push(model);
  writeDb(models);
}

// Convert uploaded file to GLB using assimp or gltf-pipeline
async function convertToGlb(inputPath: string, ext: string): Promise<string> {
  const outputPath = inputPath.replace(/\.[^.]+$/, ".glb");

  if (ext === ".fbx") {
    // FBX → GLB via assimp
    await execFileAsync("assimp", ["export", inputPath, outputPath, "-fglb2"]);
    return outputPath;
  }

  if (ext === ".glb") {
    // Already GLB — just copy/rename
    if (inputPath !== outputPath) fs.copyFileSync(inputPath, outputPath);
    return outputPath;
  }

  if (ext === ".gltf") {
    // GLTF → GLB via gltf-pipeline
    const { gltfToGlb } = await import("gltf-pipeline");
    const gltfContent = fs.readFileSync(inputPath);
    const basedir = path.dirname(inputPath);

    // Collect external resources if any
    const separateResources: Record<string, Buffer> = {};
    const gltfObj = JSON.parse(gltfContent.toString());

    // Load buffers
    if (gltfObj.buffers) {
      for (const buf of gltfObj.buffers) {
        if (buf.uri && !buf.uri.startsWith("data:")) {
          const bufPath = path.join(basedir, buf.uri);
          if (fs.existsSync(bufPath)) separateResources[buf.uri] = fs.readFileSync(bufPath);
        }
      }
    }
    // Load images
    if (gltfObj.images) {
      for (const img of gltfObj.images) {
        if (img.uri && !img.uri.startsWith("data:")) {
          const imgPath = path.join(basedir, img.uri);
          if (fs.existsSync(imgPath)) separateResources[img.uri] = fs.readFileSync(imgPath);
        }
      }
    }

    const result = await gltfToGlb(gltfContent, { separate: false, separateResources });
    fs.writeFileSync(outputPath, result.glb);
    return outputPath;
  }

  throw new Error(`Unknown extension: ${ext}`);
}

// Also generate GLTF from GLB for non-binary viewer support
async function glbToGltfJson(glbPath: string): Promise<string> {
  const { glbToGltf } = await import("gltf-pipeline");
  const glbBuffer = fs.readFileSync(glbPath);
  const result = await glbToGltf(glbBuffer);
  const gltfPath = glbPath.replace(/\.glb$/, "_viewer.gltf");
  fs.writeFileSync(gltfPath, JSON.stringify(result.gltf, null, 2));
  return gltfPath;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/models — list all models
router.get("/", (_req, res) => {
  const models = readDb().filter(m => {
    const file = path.join(UPLOADS_DIR, m.outputFile);
    return fs.existsSync(file);
  });
  res.json(models);
});

// POST /api/models/upload — upload + auto-convert
router.post("/upload", upload.single("model"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const ext = path.extname(req.file.originalname).toLowerCase();
  const id = path.basename(req.file.filename, path.extname(req.file.filename));

  const meta: ModelMeta = {
    id,
    name: path.basename(req.file.originalname, ext),
    originalName: req.file.originalname,
    originalFormat: ext.slice(1).toUpperCase(),
    outputFormat: "GLB",
    outputFile: `${id}.glb`,
    size: req.file.size,
    uploadedAt: new Date().toISOString(),
    status: "converting",
  };

  addOrUpdate(meta);
  res.json({ ...meta, message: "Conversion started" });

  // Convert in background
  try {
    const glbPath = await convertToGlb(req.file.path, ext);
    const glbFile = path.basename(glbPath);

    meta.outputFile = glbFile;
    meta.outputFormat = "GLB";
    meta.status = "ready";
    addOrUpdate(meta);

    // Clean up original if it's different from output
    if (req.file.path !== glbPath && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  } catch (err: any) {
    meta.status = "error";
    meta.error = err.message || String(err);
    addOrUpdate(meta);
    console.error("[models] conversion error:", err);
  }
});

// GET /api/models/status/:id — check conversion status
router.get("/status/:id", (req, res) => {
  const models = readDb();
  const model = models.find(m => m.id === req.params.id);
  if (!model) {
    res.status(404).json({ error: "Model not found" });
    return;
  }
  res.json(model);
});

// GET /api/models/file/:id — serve the model file
router.get("/file/:id", (req, res) => {
  const models = readDb();
  const model = models.find(m => m.id === req.params.id);
  if (!model || model.status !== "ready") {
    res.status(404).json({ error: "Model not ready or not found" });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, model.outputFile);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found on disk" });
    return;
  }

  const ext = path.extname(model.outputFile).toLowerCase();
  const contentType = ext === ".glb"
    ? "model/gltf-binary"
    : ext === ".gltf"
      ? "model/gltf+json"
      : "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Disposition", `inline; filename="${model.name}.glb"`);
  res.sendFile(filePath);
});

// DELETE /api/models/:id — remove a model
router.delete("/:id", (req, res) => {
  const models = readDb();
  const idx = models.findIndex(m => m.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const model = models[idx];
  const filePath = path.join(UPLOADS_DIR, model.outputFile);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  // Also remove original if different
  const origFiles = fs.readdirSync(UPLOADS_DIR).filter(f =>
    f.startsWith(model.id) && f !== model.outputFile && f !== "models.json"
  );
  origFiles.forEach(f => fs.unlinkSync(path.join(UPLOADS_DIR, f)));

  models.splice(idx, 1);
  writeDb(models);
  res.json({ success: true });
});

export default router;
