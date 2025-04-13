import dotenv from "dotenv"; 
dotenv.config(); 
import express from "express";
import cors from "cors";
import { leerRecetas,crearReceta,borrarReceta,editarReceta } from "./db.js";
import multer from "multer";

const storage = multer.diskStorage({
  destination: function (peticion, fichero, callback) {
    callback(null, "public/uploads");
  },
  filename: function (peticion, fichero, callback) {
    callback(null, fichero.originalname);
  }
});

const upload = multer({ storage });

const servidor = express();

servidor.use(cors()); 

servidor.use(express.json());

//Si la variable de entorno PRUEBAS está definida, se habilita /pruebas, que servirá archivos estáticos desde la carpeta ./pruebas.
if(process.env.PRUEBAS){
    servidor.use("/pruebas",express.static("./pruebas"))
};

servidor.use("/uploads", express.static("public/uploads"));

//Definición de rutas


servidor.get("/recetas", async (peticion,respuesta) => {
    try{

        let recetas = await leerRecetas();

        respuesta.json(recetas);

    }catch(error){

        respuesta.status(500);

        respuesta.json({ error : "error en el servidor" });

    }
});

servidor.post("/recetas/nueva",  upload.single("img"), async (peticion,respuesta,siguiente) => {

    let { receta, ingredientes, elaboracion, categoria } = peticion.body;
    let imagen = peticion.file ? `/uploads/${peticion.file.originalname}` : "/uploads/default.png";

    if(receta != undefined){
        receta = receta.toString();
    }

    let valido = receta && receta.trim() != "";

    if(valido){

        try{

            let id = await crearReceta(receta,ingredientes, elaboracion, imagen, categoria);

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
    let nuevaImagen = peticion.file ? `/uploads/${peticion.file.originalname}` : peticion.body.img;

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