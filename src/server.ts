

import { ethers } from "ethers";
import * as dotenv from "dotenv";
import fs from "fs";

const path = process.env.NODE_ENV === "test" ? ".env.test" : ".env";


dotenv.config({ path });

import express from 'express';
import cors from 'cors';
import { createTask } from "./controllers/task";
import { monitorNewTasks, registerOperator } from "./controllers/avs";


export const taskQueueAddress =
  "layer1rfjdfgj209sq4au8vatq7xxg20jmcs2vsusw5smtm08x6l4facysx2pm09";

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.post("/task", async (req, res) => {
  await createTask(req, res);
});

// AVS stuff


app.listen(port, () => {
  registerOperator()
  .then(() => {
    monitorNewTasks().catch((error) => {
        console.error("Error monitoring tasks:", error);
    });
  })
  .catch((error) => {
    console.error("Error registering operator:", error);
    monitorNewTasks().catch((error) => {
      console.error("Error monitoring tasks:", error);
    });
  });
});
