import dotenv from "dotenv"; 
dotenv.config(); 
import express from "express";
import cors from "cors";
import { leerRecetas,crearReceta,borrarReceta,editarReceta } from "./db.js";

const servidor = express();

servidor.use(cors()); 

servidor.use(express.json());

//Si la variable de entorno PRUEBAS está definida, se habilita /pruebas, que servirá archivos estáticos desde la carpeta ./pruebas.
if(process.env.PRUEBAS){
    servidor.use("/pruebas",express.static("./pruebas"))
};

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

servidor.post("/recetas/nueva", async (peticion,respuesta,siguiente) => {

    let {receta,ingredientes, elaboracion, img, categoria} = peticion.body;

    if(receta != undefined){
        receta = receta.toString();
    }

    let valido = receta && receta.trim() != "";

    if(valido){

        try{

            let id = await crearReceta(receta,ingredientes, elaboracion, img, categoria);

            return respuesta.json({id});

        }catch(error){
            respuesta.status(500);

            respuesta.json({ error : "error en el servidor" });
        };
        
    };

    siguiente(true);

});

servidor.delete("/recetas/borrar/:id([a-f0-9]{24})", async (peticion,respuesta,siguiente) => { //restringe :id a solo números (0-9 y al menos un dígito(+))
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

servidor.put("/recetas/editar/texto/:id([a-f0-9]{24})", async (peticion,respuesta,siguiente) => {
    
    let {receta,ingredientes, elaboracion, img, categoria} = peticion.body;

    if(receta != undefined){
        receta = receta.toString();
    }

    let valido = receta != undefined && receta.trim() != "";

    if(valido){
        try{

            let count = await editarReceta(peticion.params.id, receta, ingredientes, elaboracion, img, categoria);

            if(count){
                respuesta.status(204);
                return respuesta.send("");
            }

            siguiente();

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