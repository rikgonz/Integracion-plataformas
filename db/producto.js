const knex = require("./knek");

function createProducto(producto){
    return knex("producto").insert(producto);
};

function getAllProducto(){
    return knex("producto").select("*");
};

function getProductoById(id) {
    return knex("producto").where({ id: id }).first();
}

function deleteProducto(id){
    return knex("producto").where("id", id).del();
};

function updateProducto(id,prod){
    return knex("producto").where("id",id).update(prod)
};

module.exports= {
    createProducto,
    getAllProducto,
    deleteProducto,
    updateProducto,
    getProductoById
}