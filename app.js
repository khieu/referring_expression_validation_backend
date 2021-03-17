const express = require('express')
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.static('public'));
const port = 3000

const num_images = 20;
let rawdata = fs.readFileSync('solutions.json');
let solutions = JSON.parse(rawdata);


app.get('/', (req, res) => {
  
  let avail_imgs = JSON.parse(fs.readFileSync('avail.json'));
  let img_ids = Object.keys(avail_imgs);
  let rand_indx = Math.floor((Math.random() * img_ids.length));
  res.send(`http://localhost:3000/images/${img_ids[rand_indx]}.png`)
})


app.post('/submit', (req, res) => {
  // get response
  let img_id = req.query['img_id'];
  let response = req.query['response'];
  // get solution
  let sol = solutions[img_id];
  let record_data = '';
  if (response == String(sol)) {
    record_data = `${img_id},true`;
  } else if (isNaN(response)) {
    record_data = `${img_id},${response}`;
  } else {
    record_data = `${img_id},false`;
  }
  // record response
  fs.appendFile('record.txt', record_data+'\n', function (err) {
    if (err) throw err;
    console.log('Saved!');
    let avail_imgs = JSON.parse(fs.readFileSync('avail.json'));
    delete avail_imgs[img_id];
    fs.writeFile('avail.json', JSON.stringify(avail_imgs), (err) => {
      console.log(err);
    });

  });
  
  res.send(`successful`)
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
