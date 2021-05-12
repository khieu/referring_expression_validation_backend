const express = require('express')
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.static('public'));
const port = 3000

//attention check images
test_attention_images = [2585,585,2516,4863,4151];
// maximum number of instances per prolific_id
const NUM_IMAGES = 50;
const NUM_ATTENTION_CHECK = 5;
// prolific completion link
const prolific_link = 'https://app.prolific.co/submissions/complete?cc=CE66EE71';

let rawdata = fs.readFileSync('solutions.json');
let solutions = JSON.parse(rawdata);
let generated_expressions = JSON.parse(fs.readFileSync('generated_expressions_with_true_target.json'));

// draw a random instance, if the list of available instances is empty, copy from backup and draw
function get_random_instance(res) {
  let avail_imgs = JSON.parse(fs.readFileSync('avail.json'));
  let img_ids = Object.keys(avail_imgs);
  let rand_indx = Math.floor((Math.random() * img_ids.length));
  if (typeof img_ids[rand_indx] == 'undefined') {
    fs.copyFile('avail.json.prolific', 'avail.json', (err) => {
      if (err) throw err;
      let avail_imgs = JSON.parse(fs.readFileSync('avail.json'));
      let img_ids = Object.keys(avail_imgs);
      let rand_indx = Math.floor((Math.random() * img_ids.length));
      let expression = generated_expressions[String(img_ids[rand_indx])];
      let sol = solutions[img_ids[rand_indx]];
      res.json({
        'img':`http://csa2.bu.edu:3000/images/${img_ids[rand_indx]}.png`,
        'expression': expression,
        'solution': sol
      });
    });
  } else {
    let expression = generated_expressions[String(img_ids[rand_indx])];
    let sol = solutions[img_ids[rand_indx]];
    res.json({
      'img':`http://csa2.bu.edu:3000/images/${img_ids[rand_indx]}.png`,
      'expression': expression,
      'solution': sol
    });
  }
}

app.get('/', (req, res) => {
  // check if this user has completed NUM_IMAGES. if so, the last 5 images will be attention check items
  let prolific_id = req.query['prolific_id'];
  let fileName = `./data/${prolific_id}.txt`;
  fs.open(fileName, (err) => {
    // if file does not exist, send an instance
    if (err) {
      get_random_instance(res);
    } else {
      // if file exists, count # lines, if < NUM_IMAGES, send from avail_imgs
      let fileBuffer =  fs.readFileSync(fileName);
      let to_string = fileBuffer.toString();
      let split_lines = to_string.split("\n");
      let num_responses = split_lines.length-1;
      if (num_responses < NUM_IMAGES) {
        get_random_instance(res);
      // if we still need to do attention check, keep sending attention check images. 
      } else if (num_responses < NUM_IMAGES + NUM_ATTENTION_CHECK) {
        let idx = test_attention_images[num_responses % NUM_IMAGES];
        let expression = generated_expressions[String(idx)];
        let sol = solutions[idx];
        res.json({
          'img':`http://csa2.bu.edu:3000/images/${idx}.png`,
          'expression': expression,
          'solution': sol
        });
      // we are done, send prolific link back. 
      } else {
        console.log('DONE LOGGING, send prolific link back' + prolific_link);
        console.log(res.headersSent); // false
        res.json({'link': prolific_link});
        console.log(res.headersSent); // true
      }
    }
  })
})

// HANDLING SUBMISSION FROM THE USER
app.post('/submit', (req, res) => {
  // get response
  let img_id = req.query['img_id'];
  let response = req.query['response'];
  let prolific_id = req.query['prolific_id'];

  // get solution
  let sol = solutions[img_id];
  console.log('solution' + String(sol) + `, response: ${response}`)
  let record_data = '';
  if (response == String(sol)) {
    record_data = `${img_id},true`;
  } else if (isNaN(response)) {
    record_data = `${img_id},${response}`;
  } else {
    record_data = `${img_id},false`;
  }

  // record response to file <prolific_id>.txt
  let fileName = `./data/${prolific_id}.txt`;
  fs.open(fileName, (err) => {
    // if file does not exist, create a new file
    if (err) {
      fs.writeFile(fileName, record_data+'\n', function (err){
        if (err) throw err;
        console.log('Saved!');
        let avail_imgs = JSON.parse(fs.readFileSync('avail.json'));
        delete avail_imgs[img_id];
        fs.writeFile('avail.json', JSON.stringify(avail_imgs), (err) => {
          console.log(err);
        });
        res.json({'message': 'response recorded'});
      })
    // file already exists, count number of response, if # response < NUM_IMAGES + NUM_ATTENTION_CHECK then record
    } else {
      let fileBuffer =  fs.readFileSync(fileName);
      let to_string = fileBuffer.toString();
      let split_lines = to_string.split("\n");
      let num_responses = split_lines.length-1;
      console.log(`num responses for ${prolific_id}: ${num_responses}`);
      if (num_responses < NUM_IMAGES+NUM_ATTENTION_CHECK) {
        fs.appendFile(fileName, record_data+'\n', function (err) {
          if (err) throw err;
          console.log('Saved!');
          let avail_imgs = JSON.parse(fs.readFileSync('avail.json'));
          delete avail_imgs[img_id];
          fs.writeFile('avail.json', JSON.stringify(avail_imgs), (err) => {
            console.log(err);
          });
          res.json({'message': 'response recorded'});
        });
      } else {
        console.log('DONE LOGGING, send prolific link back');
        res.json({'message': 'thank you for completing the survey'});
      }
    } 
  });
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
