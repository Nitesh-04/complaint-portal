import pg from "pg";
import env from "dotenv";

env.config();

const db = new pg.Client({
    user:"postgres",
    host:"localhost",
    database: process.env.NAME,
    password: process.env.PASSWORD,
    port:5432,
});

await db.connect();

export default db;