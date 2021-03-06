require('dotenv').config();

const express = require('express'),
      router = express.Router();
      jwt = require('jsonwebtoken');
      bcrypt = require('bcrypt');
      saltRounds = 9;
      withAuth = require('../middleware');
      crypto = require('crypto');
      nodemailer = require('nodemailer');

      registerValidation = require('../validation/register.validation');
      loginValidation = require('../validation/login.validation')

// User Model
let userSchema = require('../models/User');
  
// CREATE user
router.post('/', async (req, res, next) => {
      
    // to hash pass
    const salt = await bcrypt.genSalt(9);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);

    const user = new userSchema({
      name: req.body.name,
      email: req.body.email,
      tel: req.body.tel,
      password: hashedPassword,
      role: req.body.role,
      resetPasswordToken: ' '
    });

    try {
      const value = await registerValidation.validateAsync(user._doc);
      const savedUser = user.save();
      res.send("User registered");

    }catch(err){
      res.status(500).send(err);
    }
});

// LOGIN users
router.post('/login', async (req, res) => {
  // validation of written data by user
  const userValid = {
    email: req.body.email,
    password: req.body.password
  };
  const value = await loginValidation.validateAsync(userValid._doc);
  
  // check if there is such user in db
  const user = await userSchema.findOne({email: req.body.email});
  if ( user == null ) {
    return res.status(400).send("Cannot find a user.")
  }
  try {
    if(await bcrypt.compare(req.body.password, user.password)) {
      // token
      const accessToken = jwt.sign({ _id: user._id }, process.env.ACCESS_TOKEN_SECRET);
      res.header('authorization', accessToken).json({ accessToken, user })
    } else {
      res.send("Credentials are not correct.")
    }
  } catch {
    res.status(500).send();
  }
});

// READ users
router.get('/', (req, res) => {
  userSchema.find((error, data) => {
    if (error) {
      return next(error)
    } else {
      res.json(data)
    }
  })
})

// READ Single user
router.get('/:id', withAuth, (req, res) => {
  userSchema.findById(req.params.id, (error, data) => {
    if (error) {
      return next(error)
    } else {
      res.json(data)
    }
  })
});


// UPDATE user password
router.put('/:id', withAuth, (req, res, next) => {
  userSchema.findById({ _id: req.params.id }, async (err, userSchema) => {

    if (!userSchema) {
      res.status(404).send("There is no user with such id.");
    }

    try {
      if (await bcrypt.compare(req.body.oldPassword, userSchema.password)) {

        const salt = await bcrypt.genSalt(9);
        const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);

        userSchema.password = hashedPassword;
        userSchema.save();
        res.json('userSchema updated!');
        // token
        // const accessToken = jwt.sign({ _id: userSchema._id }, process.env.ACCESS_TOKEN_SECRET);
        // res.header('authorization', accessToken).json({ accessToken, user })
      } else {
        res.send("Old password is not correct.")
      }

    } catch(err) {
      res.status(500).send(err);
    }
  })
});


// DELETE user
router.delete('/:id', (req, res, next) => {
  userSchema.findByIdAndRemove(req.params.id, (error, data) => {
    if (error) {
      return next(error);
    } else {
      res.status(200).json({
        msg: data
      })
    }
  })
})

module.exports = router;
