//Change some terms to more human readable
const translations = {
  precision: 'GPS Accuracy',
  fix: 'GPS Fix'
};

//Returns the GPS data as a string
function getGPGS5Data(data) {
  let frameRate;
  if (data['frames/second'] != null) frameRate = `${Math.round(data['frames/second'])} fps`;
  for (const key in data) {
    let device;
    if (data[key]['device name'] != null) device = data[key]['device name'];
    if (data[key].streams) {
      for (const stream in data[key].streams) {
        //If we find a GPS5 stream, we won't look on any other DEVCS
        if (stream === 'GPS5' && data[key].streams.GPS5.samples) {
          let name;
          if (data[key].streams.GPS5.name != null) name = data[key].streams.GPS5.name;
          let units;
          if (data[key].streams.GPS5.units != null) units = data[key].streams.GPS5.units.toString();
          let inner = '';
          let sticky = {};
          //Loop all the samples
          data[key].streams.GPS5.samples.forEach(s => {
            //Check that at least we have the valid values
            if (s.value && s.value.length > 1) {
              //Update and remember sticky data
              if (s.sticky) sticky = { ...sticky, ...s.sticky };
              let partialSticky = [];
              let cmt = '';
              let time = '';
              //Create comments for sample
              for (const key in sticky) partialSticky.push(`${translations[key] || key}: ${sticky[key]}`);
              if (s.value.length > 3) partialSticky.push(`2D Speed: ${s.value[3]}`);
              if (s.value.length > 4) partialSticky.push(`3D Speed: ${s.value[4]}`);
              //Create comment string
              if (partialSticky.length)
                cmt = `
            <description>${partialSticky.join('; ')}</description>`;
              //Set time if present
              if (s.date != null)
                time = `
            <TimeStamp>
                <when>${s.date.toISOString()}</when>
            </TimeStamp>`;
              //Prepare coordinates
              let coords = [s.value[1], s.value[0]];
              //Set elevation if present
              if (s.value.length > 2) coords.push(s.value[2]);
              //Create sample string
              const partial = `
        <Placemark>
            ${cmt.trim()}
            <Point>
                <coordinates>${coords.join(',')}</coordinates>
            </Point>
            ${time.trim()}
        </Placemark>`;
              //Add it to samples
              inner += `${partial}`;
            }
          });
          //Create description of file/stream
          const description = [device, frameRate, name, units].filter(e => e != null).join('. ');
          return { inner, description };
        }
      }
    }
    return '';
  }
}

//Converts the processed data to KML
module.exports = function(data, { name }) {
  const converted = getGPGS5Data(data);
  let string = `\
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://earth.google.com/kml/2.0">
    <Document>
        <name>${name}</name>
        <description>${converted.description}</description>
        ${converted.inner.trim()}
    </Document>
</kml>`;
  return string;
};
