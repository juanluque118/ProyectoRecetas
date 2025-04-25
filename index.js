import dotenv from "dotenv"; 
dotenv.config();

import express from "express";
import cors from "cors";
import session from "express-session";
// Para guardar sesiones en MongoDB
import MongoStore from "connect-mongo";

import { leerRecetas,crearReceta,borrarReceta,editarReceta } from "./db.js";

import multer from "multer"; //Permite recibir imágenes desde formularios.

// Servicio para alojar imágenes en la nube.
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Configuración de Cloudinary (para imágenes)
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
  });
  
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'recetas',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
    }
  });
  
const upload = multer({ storage });

// Configuración del servidor
const servidor = express();

// Usuarios disponibles para iniciar sesión
const usuarios = [
    { usuario: process.env.USUARIO1, contraseña: process.env.CONTRASENA1 },
    { usuario: process.env.USUARIO2, contraseña: process.env.CONTRASENA2 },
    { usuario: process.env.USUARIO3, contraseña: process.env.CONTRASENA3 }
  ];

// CORS
servidor.use(cors({
    origin: 'https://lacocinade.onrender.com',
    credentials: true // Permite el envío de cookies
  })); 

// JSON
servidor.use(express.json());

// Necesario en Render para que (secure: true) en cookies funcione correctamente con HTTPS.
servidor.set('trust proxy', 1);

// Configuracion de sesiones con mongo
servidor.use(session({
    secret: "abc123", 
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.DB_URL, // Guardo sesiones en MongoDB
        ttl: 3600 // Duración de la sesión en segundos (1 hora)
      }),
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'none' // Permite cookies cross-site para Safari
      }
      
  }));


// Login y logout

servidor.post("/login", (peticion, respuesta) => {
    const { usuario, contraseña } = peticion.body;
    const encontrado = usuarios.find( // Busco el usuario en la lista
      (u) => u.usuario === usuario && u.contraseña === contraseña
    );

    if (encontrado) {
        peticion.session.usuario = usuario; // Guardo el usuario en la sesión
        return respuesta.json({ ok: true });
    }
    respuesta.status(401).json({ error: "Credenciales incorrectas" });
});

servidor.get("/usuario", (peticion, respuesta) => {
    if (peticion.session.usuario) {
      respuesta.json({ usuario: peticion.session.usuario }); // Devuelve el usuario que esté en la sesión.
    } else {
      respuesta.status(401).json({ error: "No autenticado" });
    }
});

// Salgo de la sesion y me debe redirigir al login
servidor.post("/logout", (peticion, respuesta) => {
    peticion.session.destroy(() => {
      respuesta.json({ ok: true });
    });
});


  // Definición de rutas

servidor.get("/recetas", async (peticion,respuesta) => {
    try{

        let usuarioID = peticion.session.usuario;

        let recetas = await leerRecetas(usuarioID); // Cada usuario lee sus recetas

        respuesta.json(recetas);

    }catch(error){

        respuesta.status(500);

        respuesta.json({ error : "error en el servidor" });

    }
});
  
// Sube la imagen a Cloudinary.
// Crea una receta nueva con los datos recibidos.
// Si no se envía una imagen, usa una imagen por defecto.
servidor.post("/recetas/nueva",  upload.single("img"), async (peticion,respuesta,siguiente) => {
    
    let { receta, ingredientes, elaboracion, categoria } = peticion.body;
    let imagen = peticion.file ? peticion.file.path : "https://res.cloudinary.com/dahrsea95/image/upload/v1745574510/default_lhu2xg.png";
    let usuarioID = peticion.session.usuario; 


    if(receta != undefined){
        receta = receta.toString();
    }

    let valido = receta && receta.trim() != "";

    if(valido){

        try{

            let id = await crearReceta(receta,ingredientes, elaboracion, imagen, categoria, usuarioID);

            return respuesta.json({id, img: imagen});

        }catch(error){
            respuesta.status(500);

            respuesta.json({ error : "error en el servidor" });
        };
        
    };

    siguiente(true);

});

// Borra la receta del ID indicado.
servidor.delete("/recetas/borrar/:id([a-f0-9]{24})", async (peticion,respuesta,siguiente) => { 
   try{

        let count = await borrarReceta(peticion.params.id);

        if(count){
            respuesta.status(204);
            return respuesta.send("");
        }

        siguiente();

   }catch(error){

        respuesta.status(500);

        respuesta.json({ error : "error en el servidor" });
   }
    
});

// Permite actualizar una receta existente (incluyendo su imagen si se cambia).
servidor.put("/recetas/editar/:id([a-f0-9]{24})", upload.single("img"), async (peticion,respuesta,siguiente) => {

    
    let { receta, ingredientes, elaboracion, categoria } = peticion.body;
    let nuevaImagen = peticion.file ? peticion.file.path : peticion.body.img;


    if(receta != undefined){
        receta = receta.toString();
    }

    let valido = receta != undefined && receta.trim() != "";

    if(valido){
        try{
            
            let imagen = nuevaImagen || peticion.body.img;
            let count = await editarReceta(peticion.params.id, receta, ingredientes, elaboracion, imagen, categoria);

            if (count == 1) {
                return respuesta.status(200).json({ img: nuevaImagen });
            }

        }catch(error){

            respuesta.status(500);

            respuesta.json({ error : "error en el servidor" });
        }
    }
});


// Al no tener url entra cualquier peticion, y si llega aqui es porque no encajo con los anteriones middlewares

servidor.use((error,peticion,respuesta,siguiente) => {
    respuesta.status(400);
    respuesta.json({ error : "Error en la petición" })
});

servidor.use((peticion,respuesta) => { 
    respuesta.status(404);
    respuesta.json({ error : "Recurso no encontrado" })
});

// Escucha en el puerto asignado por Render
servidor.listen(process.env.PORT);