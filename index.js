import dotenv from "dotenv"; 
dotenv.config(); 
import express from "express";
import cors from "cors";
import session from "express-session";
import { leerRecetas,crearReceta,borrarReceta,editarReceta } from "./db.js";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

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

const servidor = express();

const usuarios = [
    { usuario: process.env.USUARIO1, contraseña: process.env.CONTRASENA1 },
    { usuario: process.env.USUARIO2, contraseña: process.env.CONTRASENA2 }
  ];

servidor.use(cors({
    origin: 'https://lacocinade.onrender.com', // Especificar el origen del frontend
    credentials: true // Permitir el envío de cookies o encabezados de autenticación
  })); 

servidor.use(express.json());

servidor.set('trust proxy', 1);

servidor.use(session({
    secret: "abc123", 
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'none'
      }
      
  }));


servidor.use("/uploads", express.static("public/uploads"));

//Login y logout

servidor.post("/login", (peticion, respuesta) => {
    const { usuario, contraseña } = peticion.body;
    const encontrado = usuarios.find(
      (u) => u.usuario === usuario && u.contraseña === contraseña
    );

    if (encontrado) {
        peticion.session.usuario = usuario;
        return respuesta.json({ ok: true });
    }
    respuesta.status(401).json({ error: "Credenciales incorrectas" });
});

servidor.get("/usuario", (peticion, respuesta) => {
    if (peticion.session.usuario) {
      respuesta.json({ usuario: peticion.session.usuario });
    } else {
      respuesta.status(401).json({ error: "No autenticado" });
    }
});
  
servidor.post("/logout", (peticion, respuesta) => {
    peticion.session.destroy(() => {
      respuesta.json({ ok: true });
    });
});


  //Definición de rutas

servidor.get("/recetas", async (peticion,respuesta) => {
    try{

        let usuarioID = peticion.session.usuario;

        let recetas = await leerRecetas(usuarioID);

        respuesta.json(recetas);

    }catch(error){

        respuesta.status(500);

        respuesta.json({ error : "error en el servidor" });

    }
});
  

servidor.post("/recetas/nueva",  upload.single("img"), async (peticion,respuesta,siguiente) => {

    let { receta, ingredientes, elaboracion, categoria } = peticion.body;
    let imagen = peticion.file ? peticion.file.path : "/uploads/default.png";
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


servidor.use((error,peticion,respuesta,siguiente) => {
    respuesta.status(400);
    respuesta.json({ error : "Error en la petición" })
});


servidor.use((peticion,respuesta) => { //Al no tener url entra cualquier peticion, y si llega aqui es porque no encajo con los anteriones middlewares
    respuesta.status(404);
    respuesta.json({ error : "Recurso no encontrado" })
});


servidor.listen(process.env.PORT);