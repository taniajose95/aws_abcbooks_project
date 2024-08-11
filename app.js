const API_URL = 'https://rveq59f44c.execute-api.us-east-1.amazonaws.com/dev';
const UPLOAD_URL = `${API_URL}/upload-url`;
let books = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');
    setupEventListeners();
    showSection('about');
});

function setupEventListeners() {
    console.log('Setting up event listeners');
    const viewLibraryBtn = document.getElementById('view-library');
    const addEbookBtn = document.getElementById('add-ebook');
    const addBookForm = document.getElementById('add-book-form');
    const updateBookForm = document.getElementById('update-book-form');

    if (viewLibraryBtn) viewLibraryBtn.addEventListener('click', () => showSection('book-list'));
    if (addEbookBtn) addEbookBtn.addEventListener('click', () => showSection('add-book'));
    if (addBookForm) addBookForm.addEventListener('submit', addBook);
    if (updateBookForm) updateBookForm.addEventListener('submit', saveUpdatedBook);

    // Ensure 'book-list' section fetches books only once
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = e.target.getAttribute('onclick').match(/'([^']+)'/)[1];
            if (sectionId === 'book-list' && document.getElementById('book-list').style.display !== 'block') {
                showSection(sectionId);
            } else {
                showSection(sectionId, false); // skip fetchBooks if already displayed
            }
        });
    });
}

function showSection(sectionId, shouldFetchBooks = true) {
    console.log(`Showing section: ${sectionId}`);
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionId).style.display = 'block';
    if (sectionId === 'book-list' && shouldFetchBooks) {
        fetchBooks();
    }
}


function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';

    // Image or Default Title
    if (book.ImageUrl) {
        const img = document.createElement('img');
        img.src = book.ImageUrl;
        img.alt = book.Title;
        card.appendChild(img);
    } else {
        const defaultImage = document.createElement('div');
        defaultImage.className = 'default-image';
        defaultImage.textContent = book.Title;
        card.appendChild(defaultImage);
    }

    // Book Info
    const infoDiv = document.createElement('div');
    infoDiv.className = 'book-info';
    const title = document.createElement('h3');
    title.textContent = book.Title;
    infoDiv.appendChild(title);
    const authors = document.createElement('p');
    authors.textContent = `by ${Array.isArray(book.Authors) ? book.Authors.join(', ') : book.Authors}`;
    infoDiv.appendChild(authors);
    if (book.Publisher) {
        const publisher = document.createElement('p');
        publisher.textContent = `Publisher: ${book.Publisher}`;
        infoDiv.appendChild(publisher);
    }
    const year = document.createElement('p');
    year.textContent = `Year: ${book.Year}`;
    infoDiv.appendChild(year);
    card.appendChild(infoDiv);

    // Action Buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'book-actions';
    const updateButton = document.createElement('button');
    updateButton.textContent = 'Update';
    updateButton.onclick = () => updateBook(book.id);
    actionsDiv.appendChild(updateButton);
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.onclick = () => deleteBook(book.id);
    actionsDiv.appendChild(deleteButton);
    card.appendChild(actionsDiv);

    return card;
}

async function fetchBooks() {
    try {
        console.log('Fetching books...');
        const response = await fetch(`${API_URL}/abc_books`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched data:', data);

        let parsedData;
        if (typeof data.body === 'string') {
            try {
                parsedData = JSON.parse(data.body);
            } catch (e) {
                console.error('Error parsing response body:', e);
                parsedData = [];
            }
        } else {
            parsedData = data.body || [];
        }

        books = Array.isArray(parsedData) ? parsedData : [parsedData];

        console.log('Processed books:', books);
        displayBooks();
    } catch (error) {
        console.error('Error fetching books:', error);
        books = [];
        displayBooks();
    }
}

async function displayBooks() {
    const booksContainer = document.getElementById('books-container');
    booksContainer.innerHTML = '';

    console.log('Displaying books:', books);

    if (!Array.isArray(books) || books.length === 0) {
        console.log('No books to display');
        booksContainer.innerHTML = '<p>No books available.</p>';
        return;
    }

    for (const book of books) {
        console.log('Processing book:', book);
        if (book.ImageUrl) {
            const imageUrl = await getImage(book.ImageUrl);
            if (imageUrl) {
                book.ImageUrl = imageUrl;
            } else {
                console.warn(`Failed to fetch image for book: ${book.Title}`);
                delete book.ImageUrl;
            }
        }
        const bookCard = createBookCard(book);
        booksContainer.appendChild(bookCard);
        console.log('Book card added:', bookCard);
    }
}

async function getImage(imageKey) {
    try {
        console.log(`Fetching image: ${imageKey}`);
        const response = await fetch(`${API_URL}/get_image?key=${encodeURIComponent(imageKey)}`, {
            method: 'GET',
        });
        console.log('Image response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data.url; // This will be the pre-signed URL
    } catch (error) {
        console.error('Error fetching image:', error);
        return null;
    }
}

async function getPresignedUrl(file) {
    try {
        const url = `${UPLOAD_URL}?file_name=${encodeURIComponent(file.name)}&file_type=${encodeURIComponent(file.type)}`;
        console.log('Requesting presigned URL:', url);
        const response = await fetch(url);
        console.log('Presigned URL response status:', response.status);
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        const data = await response.json();
        console.log('Presigned URL data:', data);
        return data;
    } catch (error) {
        console.error('Error getting presigned URL:', error);
        throw error;
    }
}

async function uploadFile(file, presignedUrl) {
    try {
        const response = await fetch(presignedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });
        console.log('File upload response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

async function addBook(event) {
    event.preventDefault();
    const fileInput = document.getElementById('image-file');
    const file = fileInput.files[0];

    try {
        let imageUrl = null;
        if (file) {
            const presignedData = await getPresignedUrl(file);
            await uploadFile(file, presignedData.upload_url);
            imageUrl = presignedData.key || `${file.name}`;
        }
        
        const newBook = {
            Title: document.getElementById('title').value,
            Authors: document.getElementById('author').value.split(',').map(author => author.trim()),
            Publisher: document.getElementById('publisher').value || "Not Specified",
            Year: parseInt(document.getElementById('year').value),
            ImageUrl: imageUrl // This will be null if no image is uploaded
        };

        console.log('Sending book data:', JSON.stringify(newBook));

        const response = await fetch(`${API_URL}/abc_books`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newBook),
        });

        console.log('Add book response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        console.log('Submit book result:', result);
        alert('Book added successfully');
        showSection('book-list');
        document.getElementById('add-book-form').reset();
    } catch (error) {
        console.error('Error adding book:', error);
        alert('Failed to add book: ' + error.message);
    }
}

async function deleteBook(id) {
    if (confirm('Are you sure you want to delete this book?')) {
        try {
            const response = await fetch(`${API_URL}/abc_books/${id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log('Delete book response status:', response.status);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            console.log('Delete book result:', data);
            alert(data.message || 'Book deleted successfully');
            fetchBooks();
        } catch (error) {
            console.error('Error deleting book:', error);
            alert('Failed to delete book: ' + error.message);
        }
    }
}

function updateBook(id) {
    console.log('Updating book with id:', id);
    const book = books.find(book => book.id === id);
    if (book) {
        const updateBookId = document.getElementById('update-book-id');
        const updateTitle = document.getElementById('update-title');
        const updateAuthor = document.getElementById('update-author');
        const updateYear = document.getElementById('update-year');
        const updatePublisher = document.getElementById('update-publisher');

        if (updateBookId && updateTitle && updateAuthor && updateYear && updatePublisher) {
            updateBookId.value = book.id;
            updateTitle.value = book.Title;
            updateAuthor.value = Array.isArray(book.Authors) ? book.Authors.join(', ') : book.Authors;
            updateYear.value = book.Year;
            updatePublisher.value = book.Publisher || '';
            showSection('update-book');
        } else {
            console.error('One or more update form elements are missing');
            alert('Error: Unable to update book. Please try again.');
        }
    } else {
        console.error('Book not found:', id);
    }
}

async function saveUpdatedBook(event) {
    event.preventDefault();
    const bookId = document.getElementById('update-book-id').value;
    const updatedBook = {
        Title: document.getElementById('update-title').value,
        Authors: document.getElementById('update-author').value.split(',').map(author => author.trim()),
        Year: parseInt(document.getElementById('update-year').value),
        Publisher: document.getElementById('update-publisher').value || "Not Specified"
    };

    try {
        const response = await fetch(`${API_URL}/abc_books/${bookId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedBook),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to update book');
        }

        console.log('Update book result:', result);
        alert('Book updated successfully');
        showSection('book-list');
        // fetchBooks();
    } catch (error) {
        console.error('Error updating book:', error);
        alert('Failed to update book: ' + error.message);
    }
}
