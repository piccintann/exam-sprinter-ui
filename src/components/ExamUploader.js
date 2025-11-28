import React, { useRef, useState } from 'react';
import { saveExamFile, saveExamImages } from '../utils/fileUtils';

const ExamUploader = ({ onFileUpload }) => {
    const examFileRef = useRef(null);
    const imagesRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [examFile, setExamFile] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);

    const handleExamFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/json') {
            setExamFile(file);
        } else {
            alert('Please select a valid JSON file');
            setExamFile(null);
        }
    };

    const handleImagesChange = (event) => {
        const files = Array.from(event.target.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        if (imageFiles.length !== files.length) {
            alert('Some files were skipped. Only image files are allowed.');
        }
        setImageFiles(imageFiles);
        console.log('Selected images:', imageFiles.map(f => f.name));
    };

    const handleUpload = async () => {
        if (!examFile) {
            alert('Please select an exam JSON file');
            return;
        }

        setUploading(true);
        try {
            const examData = await readJsonFile(examFile);
            const examName = examData[0]?.exam_name || examFile.name.replace('.json', '');

            const examSaved = await saveExamFile(examData, examFile.name);
            if (!examSaved) {
                throw new Error('Failed to save exam file');
            }

            if (imageFiles.length > 0) {
                const imagesSaved = await saveExamImages(examName, imageFiles);
                if (!imagesSaved) {
                    console.warn('Failed to save some images');
                }
            }

            onFileUpload(examData, examFile.name);

            // Reset form
            setExamFile(null);
            setImageFiles([]);
            examFileRef.current.value = '';
            imagesRef.current.value = '';

            alert(`✅ Exam uploaded successfully!\n📝 ${examData.length} questions\n🖼️ ${imageFiles.length} images`);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error uploading exam: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const readJsonFile = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    if (Array.isArray(jsonData) && jsonData.length > 0) {
                        resolve(jsonData);
                    } else {
                        reject(new Error('Invalid exam format. Expected an array of questions.'));
                    }
                } catch (error) {
                    reject(new Error('Invalid JSON file format.'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    };

    return (
        <div className="uploader-content">
            <div className="upload-description">
                <p>Upload exam files (JSON format) and associated images to practice locally.</p>
            </div>

            <div className="upload-section">
                <div className="file-input-group">
                    <label>📄 Exam JSON File *</label>
                    <input
                        type="file"
                        ref={examFileRef}
                        onChange={handleExamFileChange}
                        accept=".json"
                        className="file-input"
                    />
                    {examFile && (
                        <div className="file-info">
                            ✅ Selected: {examFile.name}
                        </div>
                    )}
                </div>

                <div className="file-input-group">
                    <label>🖼️ Images (optional)</label>
                    <input
                        type="file"
                        ref={imagesRef}
                        onChange={handleImagesChange}
                        accept="image/*"
                        multiple
                        className="file-input"
                    />
                    {imageFiles.length > 0 && (
                        <div className="file-info">
                            ✅ Selected {imageFiles.length} images:
                            <ul className="images-list">
                                {imageFiles.map((file, index) => (
                                    <li key={index}>
                                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleUpload}
                    disabled={!examFile || uploading}
                    className="upload-btn"
                >
                    {uploading ? '⏳ Uploading...' : '📤 Upload Exam'}
                </button>
            </div>

            <div className="upload-tips">
                <h4>💡 Tips:</h4>
                <ul>
                    <li>The JSON file should contain an array of question objects</li>
                    <li>Images should be referenced in questions using their filename</li>
                    <li>Supported image formats: JPG, PNG, GIF, WebP</li>
                    <li>Keep image sizes reasonable (&lt; 2MB each)</li>
                </ul>
            </div>
        </div>
    );
};

export default ExamUploader;