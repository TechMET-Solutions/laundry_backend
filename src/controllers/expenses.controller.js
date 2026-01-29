const db = require("../../config/database");


exports.createExpenses = async (req, res) => {
    try {
      const {
             date,
             category,
             amount,
             payment_mode,
             tax,
             note,

        } = req.body;

        const createTableSQL=`
        create table if not exists expenses(
            id int auto_increment primary key,
            date date not null,
            category varchar(100) not null,
            amount decimal(10,2) not null,
            payment_mode varchar(100) not null,
            tax decimal(10,2),
            note varchar(255),
            createdAt timestamp default current_timestamp
        )
        `;

        await db.query(createTableSQL);
       
        const insertSQL=`
        insert into expenses
        (
            date,
            category,
            amount,
            payment_mode,
            tax,
            note
        )
        values(?,?,?,?,?,?)
        `;

        const [result] = await db.query(insertSQL,[
            date,
            category,
            amount,
            payment_mode,
            tax,
            note,
        ]);
console.log(result);
        res.status(201).json({ message: "Expenses created successfully", id: result.insertId });
    }catch (err) {
        res.status(500).json({ error: err.message });
    }   
  }

  // ✅ GET ALL Expences

  exports.getAllExpenses = async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT * FROM expenses ORDER BY id DESC`);
        res.json({ success: true, data: rows });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, error: err.message });
    }
  }

// ✅ GET Expences BY ID
  exports.getExpensesById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(`SELECT * FROM expenses WHERE id =?`, [id]);

        if (!rows.length) {
            return res
                .status(404)
                .json({ success: false, message: "Expences not found" });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ✅ UPDATE Expences
exports.updateExpenses = async (req, res) => {
    try {
        const { id } = req.params;  
        const {
            date,
            category,
            amount, 
            payment_mode,
            tax,
            note,
        } = req.body;  
        const updateSQL=`
        update expenses set
        date=?,
        category=?,
        amount=?,
        payment_mode=?,
        tax=?,
        note=?
        where id=?
        `;

        const [result] = await db.query(updateSQL,[
            date,
            category, 
            amount,
            payment_mode,
            tax,
            note,
            id
        ]); 

         if (result.affectedRows === 0) {
            return res
                .status(404)
                .json({ success: false, message: "Expences not found" });
        }
        res.json({ success: true, message: "Expences updated successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ✅ DELETE Expences
exports.deleteExpenses = async (req, res) => {
    try {
        const { id } = req.params;  
        const deleteSQL = `DELETE FROM expenses WHERE id = ?`;
        const [result] = await db.query(deleteSQL, [id]);   
        if (result.affectedRows === 0) {
            return res
                .status(404)
                .json({ success: false, message: "Expences not found" });
        }
        res.json({ success: true, message: "Expences deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

//EXPENSE CATEGORY CONTROLLERS

//✅ CREATE EXPENSE CATEGORY
exports.createExpenseCategory=async(req,res)=>{
    
    try{
        const{expense_category, status, created_by}=req.body;
        const createTableSQL=`
        create table if not exists expense_categories(
    id int auto_increment primary key,
    expense_category varchar(100) not null,
    status varchar(255) not null,
    created_by varchar(100) not null
    )
    `;
        await db.query(createTableSQL);
        const insertSQL = `
        INSERT INTO expense_categories
        (expense_category, status, created_by)
        VALUES (?, ?, ?)
        `;
        const [result]=await db.query(insertSQL,[ expense_category,
            status,
            created_by]);
        res.status(201).json({success:true,message:"Expense category created successfully",id:result.insertId});    
    }catch(err){
        res.status(500).json({success:false,error:err.message});
    }
};

//✅ GET ALL EXPENSE CATEGORIES
exports.getAllExpenseCategories=async(req,res)=>{
    try{
        const [rows]=await db.query(`SELECT * FROM expense_categories ORDER BY id DESC`);
        res.json({success:true,data:rows});
    }
    catch(err){
        res.status(500).json({succes:false,error:err.message});
    }
}



//✅ GET EXPENSE CATEGORY BY ID
exports.getExpenseCategoryById=async(req,res)=>{
    try{
        const{id}=req.params;
        //const[rows]=await db.query(`select * from expense_catogories where id=? ${id}`)
         const [rows] = await db.query(`SELECT * FROM expense_categories WHERE id =?`, [id]);

        if(!rows.length){
            return res.status(404).json({success:false,message:"Expense category not found"});
        }
        res.status(200).json({success:true,data:rows[0]});
    }
    catch(err){
        res.status(500).json({success:false,error:err.message});
    }
}

// ✅ DELETE Expences
exports.deleteExpenseCategory = async (req, res) => {
    try {
        const { id } = req.params;  
        const deleteSQL = `DELETE FROM expense_categories WHERE id = ?`;
        const [result] = await db.query(deleteSQL, [id]);   
        if (result.affectedRows === 0) {
            return res
                .status(404)
                .json({ success: false, message: "Expences not found" });
        }
        res.json({ success: true, message: "Expences deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};


// ✅ UPDATE Expences
exports.updateExpenseCategory = async (req, res) => {
    try {
        const { id } = req.params;  
       const { expense_category, status, created_by } = req.body; 
         const updateSQL = `
        UPDATE expense_categories SET
        expense_category = ?,
        status = ?,
        created_by = ?
        WHERE id = ?
        `;

        const [result] = await db.query(updateSQL,[
             expense_category,
            status,
            created_by,
            id
        ]); 

         if (result.affectedRows === 0) {
            return res
                .status(404)
                .json({ success: false, message: "Expense category not found" });
        }
        res.json({ success: true, message: "Expenses category updated successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};