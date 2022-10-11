import { Upload } from 'lucide-preact';
import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';

interface Props {
	uploadFile: (file : File) => boolean
  fileSelected: (file : File) => void
}

// Component to select a file to upload
const FileUpload = (props: Props) => {
  const [file, sefFile] = useState<File | null>(null);

  const pickerRef = useRef<HTMLInputElement>(null);

  // On file select (from the pop up)
  const onFileChange = (event: any) => {
    console.log("File selected", event.target.files[0]);

    // Update the state
    sefFile(event.target.files[0]);
    props.fileSelected(event.target.files[0]);
  };

  const handleUpload = () => {
    console.log("handleUpload", file, pickerRef.current);

    if (file === null) {
      if (pickerRef.current) pickerRef.current.click();
    } else {
      props.uploadFile(file);
    }
  }

  const showCurrentFile = () => {
    if (file) {
      return (
        <div>
          <h2>File Details:</h2>
          <p>File Name: {file.name}</p>
          <p>File Type: {file.type}</p>
          <p>Last Modified: {file.lastModified.toString()}</p>
        </div>
      );
    } else {
      return (
        <div>
          <br />
          <h4>Choose before Pressing the Upload button</h4>
          <br />
        </div>
      );
    }
  };

  // return (
  //   <div>
  //     <div>
  //       {showCurrentFile()}
  //       <button onClick={onFileUpload}>Upload!</button>
  //     </div>
  //   </div>
  // );

  return (
    <div onClick={handleUpload}>
      <input class='hidden' ref={pickerRef} type="file" onChange={onFileChange} />
      <Upload color="white" size={16}/>
    </div>
  )
}

export default FileUpload;
