import dotenv from "dotenv"; 
dotenv.config();
import {MongoClient,ObjectId} from "mongodb";

const urlMongo = process.env.DB_URL;


function conectar(){
    return MongoClient.connect(urlMongo);
}


export function leerRecetas(usuarioID){
    return new Promise((ok,ko) => {
        conectar()
        .then(conexion => {

            let coleccion = conexion.db("recetas").collection("recetas");

            coleccion.find({ usuarioID }).toArray()
            .then( recetas => {
                conexion.close();
                ok(recetas.map( ({_id,receta,ingredientes,elaboracion,img,categoria}) => {
                    return {id:_id,receta,ingredientes,elaboracion,img,categoria};
                }));
            })
            .catch(() => {
                ko({ error : "error en base de datos" });
            });
        })
        .catch(() => {
            ko({ error : "error en base de datos" });
        });
        
    });
}


export function crearReceta(receta,ingredientes,elaboracion,img,categoria,usuarioID){
    return new Promise((ok,ko) => {
        conectar()
        .then(conexion => {

            let coleccion = conexion.db("recetas").collection("recetas");

            coleccion.insertOne({receta,ingredientes,elaboracion,img,categoria,usuarioID})
            .then( ({insertedId}) => {
                conexion.close();
                ok(insertedId);
            })
            .catch(() => {
                ko({ error : "error en base de datos" });
            });
        })
        .catch(() => {
            ko({ error : "error en base de datos" });
        });
        
    });
}


export function borrarReceta(id){
    return new Promise((ok,ko) => {
        conectar()
        .then(conexion => {

            let coleccion = conexion.db("recetas").collection("recetas");

            coleccion.deleteOne({_id : new ObjectId(id)})
            .then( ({deletedCount}) => {
                conexion.close();
                ok(deletedCount);
            })
            .catch(() => {
                ko({ error : "error en base de datos" });
            });
        })
        .catch(() => {
            ko({ error : "error en base de datos" });
        });
        
    });
}


export function editarReceta(id,receta,ingredientes,elaboracion,img,categoria){
    return new Promise((ok,ko) => {
        conectar()
        .then(conexion => {

            let coleccion = conexion.db("recetas").collection("recetas");

            coleccion.updateOne({_id : new ObjectId(id)}, {$set : { receta : receta, ingredientes : ingredientes, elaboracion : elaboracion, img : img, categoria : categoria}})
            .then( ({modifiedCount}) => {
                conexion.close();
                ok(modifiedCount);
            })
            .catch(() => {
                ko({ error : "error en base de datos" });
            });
        })
        .catch(() => {
            ko({ error : "error en base de datos" });
        });
        
    });
}