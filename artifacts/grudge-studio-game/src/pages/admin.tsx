import { useState, useCallback, useRef, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, useGLTF } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Upload, Trash2, Eye, RotateCcw, Box, CheckCircle, AlertCircle, RefreshCw, Grid3x3, Sun, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// 3D model display component using drei's useGLTF
function GltfModel({ url, wireframe }: { url: string; wireframe: boolean }) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m: any) => { m.wireframe = wireframe; });
        } else {
          child.material.wireframe = wireframe;
        }
      }
    });
  }, [scene, wireframe]);

  return <primitive object={scene} />;
}

function ModelViewer({ model, wireframe }: { model: ModelMeta; wireframe: boolean }) {
  const url = `/api/models/file/${model.id}`;
  return (
    <Canvas
      camera={{ position: [0, 1.5, 4], fov: 45 }}
      gl={{ antialias: true }}
      style={{ background: "#0a0a0f" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#d4a017" />

      <Suspense fallback={null}>
        <GltfModel url={url} wireframe={wireframe} />
        <Environment preset="night" />
      </Suspense>

      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#222230"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#333350"
        fadeDistance={15}
        fadeStrength={1}
        infiniteGrid
      />

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        autoRotate={false}
        minDistance={0.5}
        maxDistance={20}
        makeDefault
      />
    </Canvas>
  );
}

export default function Admin() {
  const [models, setModels] = useState<ModelMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; progress: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      setModels(data);
    } catch (e) {
      console.error("Failed to fetch models", e);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Poll converting models
  useEffect(() => {
    const converting = models.filter(m => m.status === "converting");
    for (const m of converting) {
      if (!pollRef.current[m.id]) {
        pollRef.current[m.id] = setInterval(async () => {
          try {
            const res = await fetch(`/api/models/status/${m.id}`);
            const updated: ModelMeta = await res.json();
            if (updated.status !== "converting") {
              clearInterval(pollRef.current[m.id]);
              delete pollRef.current[m.id];
              setModels(prev => prev.map(pm => pm.id === updated.id ? updated : pm));
            }
          } catch {}
        }, 2000);
      }
    }
    return () => {
      // Cleanup stale polls for models no longer converting
      for (const m of models) {
        if (m.status !== "converting" && pollRef.current[m.id]) {
          clearInterval(pollRef.current[m.id]);
          delete pollRef.current[m.id];
        }
      }
    };
  }, [models]);

  const uploadFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["glb", "gltf", "fbx"].includes(ext)) {
      setError(`Unsupported format: .${ext}. Supported: GLB, GLTF, FBX`);
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress({ name: file.name, progress: 0 });

    const formData = new FormData();
    formData.append("model", file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress({ name: file.name, progress: Math.round((e.loaded / e.total) * 100) });
        }
      });

      const result = await new Promise<ModelMeta>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try { reject(new Error(JSON.parse(xhr.responseText).error || "Upload failed")); }
            catch { reject(new Error("Upload failed")); }
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.open("POST", "/api/models/upload");
        xhr.send(formData);
      });

      setModels(prev => [result, ...prev]);
      setSelectedId(result.id);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }, []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  }, [uploadFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/models/${id}`, { method: "DELETE" });
      setModels(prev => prev.filter(m => m.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch {
      setError("Failed to delete model");
    }
  }, [selectedId]);

  const selectedModel = models.find(m => m.id === selectedId);

  return (
    <div className="flex h-screen bg-background text-white overflow-hidden font-sans">

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-white/10 bg-black/70 flex flex-col h-screen overflow-hidden shrink-0"
            style={{ minWidth: 280 }}
          >
            {/* Sidebar header */}
            <div className="p-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <Box className="w-5 h-5 text-primary" />
                <span className="font-display text-primary text-lg font-bold uppercase tracking-wider">Model Admin</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Upload GLB · GLTF · FBX</p>
            </div>

            {/* Upload Zone */}
            <div className="p-3 border-b border-white/10 shrink-0">
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200",
                  dragging
                    ? "border-primary bg-primary/15 scale-[1.02]"
                    : "border-white/20 hover:border-primary/50 hover:bg-white/5",
                  uploading && "pointer-events-none opacity-70"
                )}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.gltf,.fbx"
                  className="hidden"
                  onChange={e => handleFiles(e.target.files)}
                />

                {uploading && uploadProgress ? (
                  <div>
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    <div className="text-xs text-white truncate mb-1">{uploadProgress.name}</div>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress.progress}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">{uploadProgress.progress}% uploaded</div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-primary/60 mx-auto mb-2" />
                    <div className="text-xs text-white font-medium mb-0.5">Drop model here</div>
                    <div className="text-[10px] text-muted-foreground">GLB · GLTF · FBX · up to 100MB</div>
                    <div className="mt-2 text-[10px] text-primary/70 border border-primary/30 rounded px-2 py-0.5 inline-block">
                      Browse files
                    </div>
                  </>
                )}
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex gap-2 items-start"
                >
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>

            {/* Format support info */}
            <div className="px-3 py-2 border-b border-white/10 shrink-0">
              <div className="flex gap-2">
                {[
                  { ext: "FBX", note: "→ GLB via assimp", color: "#f97316" },
                  { ext: "GLB", note: "native", color: "#3b82f6" },
                  { ext: "GLTF", note: "→ GLB via pipeline", color: "#10b981" },
                ].map(f => (
                  <div key={f.ext} className="flex-1 text-center p-1 rounded bg-white/5 border border-white/8">
                    <div className="text-[9px] font-bold" style={{ color: f.color }}>{f.ext}</div>
                    <div className="text-[8px] text-muted-foreground leading-tight">{f.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model List */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                  Models ({models.length})
                </span>
                <button
                  onClick={fetchModels}
                  className="text-muted-foreground hover:text-white transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>

              {models.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs italic">
                  No models uploaded yet
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {models.map(model => (
                    <motion.div
                      key={model.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors group",
                        selectedId === model.id
                          ? "bg-primary/10 border-l-2 border-primary"
                          : "hover:bg-white/5 border-l-2 border-transparent"
                      )}
                      onClick={() => model.status === "ready" && setSelectedId(model.id)}
                    >
                      {/* Status icon */}
                      <div className="shrink-0">
                        {model.status === "converting" && <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />}
                        {model.status === "ready" && <CheckCircle className="w-4 h-4 text-green-400" />}
                        {model.status === "error" && <AlertCircle className="w-4 h-4 text-red-400" />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white truncate">{model.name}</div>
                        <div className="text-[9px] text-muted-foreground flex gap-1.5 items-center">
                          <span className="text-[8px] px-1 rounded font-bold" style={{
                            background: model.originalFormat === "FBX" ? "#f97316" + "20" : model.originalFormat === "GLB" ? "#3b82f6" + "20" : "#10b981" + "20",
                            color: model.originalFormat === "FBX" ? "#f97316" : model.originalFormat === "GLB" ? "#3b82f6" : "#10b981",
                          }}>
                            {model.originalFormat}
                          </span>
                          <span>{formatSize(model.size)}</span>
                          <span>·</span>
                          <span>{formatDate(model.uploadedAt)}</span>
                        </div>
                        {model.status === "converting" && (
                          <div className="text-[9px] text-yellow-400 mt-0.5">Converting...</div>
                        )}
                        {model.status === "error" && (
                          <div className="text-[9px] text-red-400 mt-0.5 truncate">{model.error}</div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {model.status === "ready" && (
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedId(model.id); }}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors"
                            title="View"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(model.id); }}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(p => !p)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-5 h-12 flex items-center justify-center bg-black/80 border-y border-r border-white/10 rounded-r-md text-muted-foreground hover:text-white transition-colors"
        style={{ left: sidebarOpen ? 280 : 0 }}
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Main viewer area */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Viewer Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-black/60 backdrop-blur-sm z-10 shrink-0">
          <div className="flex items-center gap-3">
            {selectedModel ? (
              <>
                <div>
                  <span className="font-display text-sm font-bold text-primary uppercase">{selectedModel.name}</span>
                  <span className="text-muted-foreground text-xs ml-2">{selectedModel.originalFormat} → {selectedModel.outputFormat}</span>
                </div>
              </>
            ) : (
              <span className="text-muted-foreground text-sm italic">Select a model to view</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedModel && (
              <a
                href={`/api/models/file/${selectedModel.id}`}
                download={`${selectedModel.name}.glb`}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
              >
                Download GLB
              </a>
            )}
            <button
              onClick={() => setWireframe(p => !p)}
              className={cn(
                "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border transition-colors",
                wireframe
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-white/20 text-muted-foreground hover:text-white hover:border-white/40"
              )}
            >
              <Grid3x3 className="w-3 h-3" />
              Wireframe
            </button>
            <button
              onClick={() => setSelectedId(null)}
              disabled={!selectedModel}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded border border-white/20 text-muted-foreground hover:text-white hover:border-white/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="flex-1 relative min-h-0">
          {selectedModel?.status === "ready" ? (
            <ModelViewer key={selectedModel.id} model={selectedModel} wireframe={wireframe} />
          ) : selectedModel?.status === "converting" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center bg-black/50">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div>
                <div className="font-display text-lg text-primary uppercase">Converting Model</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {selectedModel.originalFormat} → GLB via {selectedModel.originalFormat === "FBX" ? "Assimp" : "glTF Pipeline"}
                </div>
              </div>
            </div>
          ) : selectedModel?.status === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
              <AlertCircle className="w-12 h-12 text-red-400" />
              <div>
                <div className="font-display text-lg text-red-400 uppercase">Conversion Failed</div>
                <div className="text-sm text-muted-foreground mt-1 max-w-sm">{selectedModel.error}</div>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-center">
              {/* Empty state background grid */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `linear-gradient(rgba(212,160,23,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,160,23,0.3) 1px, transparent 1px)`,
                  backgroundSize: "40px 40px"
                }}
              />
              <div className="relative z-10">
                <Box className="w-16 h-16 text-primary/30 mx-auto mb-4" />
                <div className="font-display text-2xl text-primary/60 uppercase mb-2">3D Model Viewer</div>
                <div className="text-sm text-muted-foreground">
                  Upload a GLB, GLTF, or FBX file to view it here
                </div>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground/60">
                  <div className="flex items-center gap-1.5"><span className="text-orange-400 font-bold">FBX</span> → converted via Assimp</div>
                  <div className="flex items-center gap-1.5"><span className="text-blue-400 font-bold">GLB</span> → native binary</div>
                  <div className="flex items-center gap-1.5"><span className="text-green-400 font-bold">GLTF</span> → packed via glTF Pipeline</div>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-6 px-6 py-2.5 rounded border border-primary/40 text-primary hover:bg-primary/10 transition-colors font-display text-sm uppercase tracking-wider"
                >
                  Upload Your First Model
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Model Info Footer */}
        {selectedModel?.status === "ready" && (
          <div className="border-t border-white/10 bg-black/60 px-4 py-2 flex items-center gap-6 text-xs text-muted-foreground shrink-0">
            <div><span className="text-white/40">Name:</span> <span className="text-white">{selectedModel.name}</span></div>
            <div><span className="text-white/40">Input:</span> <span className="text-white">{selectedModel.originalFormat}</span></div>
            <div><span className="text-white/40">Output:</span> <span className="text-white">{selectedModel.outputFormat}</span></div>
            <div><span className="text-white/40">Size:</span> <span className="text-white">{formatSize(selectedModel.size)}</span></div>
            <div><span className="text-white/40">Uploaded:</span> <span className="text-white">{formatDate(selectedModel.uploadedAt)}</span></div>
            <div className="ml-auto text-white/30 text-[10px]">
              Orbit: drag · Zoom: scroll · Pan: right-click drag
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
