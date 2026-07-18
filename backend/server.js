import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import connectCloudinry from "./config/cloudinary.js";

//App config
const app = express()
const port = process.env.PORT || 4000
connectDB();
connectCloudinry();

//Middlewares
app.use(express.json())
app.use(cors())

//api endpoints

app.get('/',(req,res)=>{
    res.send('API Working')
})

app.listen(port, ()=> console.log('Server started on PORT : '+ port))