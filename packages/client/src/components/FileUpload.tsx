import { h } from 'preact';
import { useState } from 'preact/hooks';

interface Props {
	uploadFile : (file : File) => boolean
}

// Component to select a file to upload
const FileUpload = (props: Props) => {
    const [file, sefFile] = useState<File>();

    // On file select (from the pop up)
    const onFileChange = (event : any) => {
    
        // Update the state
        sefFile(event.target.files[0]);
    };

    // On file upload (click the upload button)
    const onFileUpload = () => {
        // Call the function passed as a prop
        if (file)
            props.uploadFile(file);
    };

    const showCurrentFile = () => {
        if (file) {
            return (
              <div>
                <h2>File Details:</h2>
                <p>File Name: {file.name}</p>
                <p>File Type: {file.type}</p>
                <p>
                  Last Modified:{" "}
                  {file.lastModified.toString()}
                </p>
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
    }

	return(
        <div>
            <div>
                <input type="file" onChange={onFileChange} />
                {showCurrentFile()}
                <button onClick={onFileUpload}>
                  Upload!
                </button>
            </div>
		</div>
	)
}

export default FileUpload;
