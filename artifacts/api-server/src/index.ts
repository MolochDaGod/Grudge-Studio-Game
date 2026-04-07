import app from "./app";

const port = Number(process.env["PORT"]) || 3000;

app.listen(port, () => {
  console.log(`Grudge API server listening on port ${port}`);
});
