const API_URL = "https://script.google.com/macros/s/AKfycbyzJnhNZ0DtpyBPhNnVP5rKH2HwXwgfwaMRNf3eZnDbH2_ALD0c4y0vSHBElrh7HZ6-/exec";

// === ESTADO DA APLICAÇÃO ===
let currentUser = {
    email: '',
    type: '', // 'guest' ou 'developer'
    isLoggedIn: false
};

let currentPostId = null; // Para controle de comentários

// === INICIALIZAÇÃO ===
document.addEventListener('DOMContentLoaded', function() {
    checkSession();
});

// === FUNÇÕES DE LOGIN ===
function loginAsGuest() {
    currentUser = {
        email: 'convidado@jardim.local',
        type: 'guest',
        isLoggedIn: true
    };
    saveSession();
    showMainScreen();
}

function loginAsDev(event) {
    event.preventDefault();
    
    const email = document.getElementById('devEmail').value.trim();
    const password = document.getElementById('devPassword').value.trim();
    
    // Validar senha
    if (password !== 'JARDIMSECRETO2015') {
        alert('❌ Senha incorreta! Tente novamente.');
        return;
    }
    
    // Validar se é Gmail
    if (!email.toLowerCase().includes('@gmail.com')) {
        alert('❌ Por favor, use um endereço Gmail válido.');
        return;
    }
    
    currentUser = {
        email: email,
        type: 'developer',
        isLoggedIn: true
    };
    saveSession();
    showMainScreen();
}

function logout() {
    if (confirm('Deseja realmente sair?')) {
        currentUser = {
            email: '',
            type: '',
            isLoggedIn: false
        };
        localStorage.removeItem('jardimSecreto_session');
        location.reload();
    }
}

function checkSession() {
    const session = localStorage.getItem('jardimSecreto_session');
    if (session) {
        try {
            currentUser = JSON.parse(session);
            if (currentUser.isLoggedIn) {
                showMainScreen();
                return;
            }
        } catch (e) {
            console.error('Erro ao carregar sessão:', e);
        }
    }
    showLoginScreen();
}

function saveSession() {
    localStorage.setItem('jardimSecreto_session', JSON.stringify(currentUser));
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('mainScreen').classList.remove('active');
}

function showMainScreen() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainScreen').classList.add('active');
    
    // Atualizar informações do usuário
    const userTypeText = currentUser.type === 'developer' 
        ? '👨‍💻 Desenvolvedor/Professor' 
        : '👤 Convidado/Usuário';
    document.getElementById('userType').textContent = userTypeText;
    
    // Mostrar seção de criar post apenas para desenvolvedores
    const createPostSection = document.getElementById('createPostSection');
    if (currentUser.type === 'developer') {
        createPostSection.style.display = 'block';
    } else {
        createPostSection.style.display = 'none';
    }
    
    // Carregar posts
    loadPosts();
}

// === FUNÇÕES DE POST ===
function toggleCreatePost() {
    const form = document.getElementById('createPostForm');
    const isVisible = form.style.display === 'block';
    
    if (isVisible) {
        form.style.display = 'none';
        clearPostForm();
    } else {
        form.style.display = 'block';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function clearPostForm() {
    document.getElementById('postTitle').value = '';
    document.getElementById('postDescription').value = '';
    document.getElementById('postImageUrl').value = '';
    document.getElementById('postImageFile').value = '';
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = '';
    preview.classList.remove('active');
}

// Preview de imagem
document.getElementById('postImageUrl')?.addEventListener('input', function(e) {
    const url = e.target.value.trim();
    showImagePreview(url);
});

document.getElementById('postImageFile')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            showImagePreview(event.target.result);
        };
        reader.readAsDataURL(file);
    }
});

function showImagePreview(url) {
    const preview = document.getElementById('imagePreview');
    if (url) {
        preview.innerHTML = `<img src="${url}" alt="Preview">`;
        preview.classList.add('active');
    } else {
        preview.innerHTML = '';
        preview.classList.remove('active');
    }
}

async function createPost(event) {
    event.preventDefault();
    
    if (currentUser.type !== 'developer') {
        alert('❌ Apenas desenvolvedores e professores podem criar posts!');
        return;
    }
    
    const title = document.getElementById('postTitle').value.trim();
    const description = document.getElementById('postDescription').value.trim();
    let imageUrl = document.getElementById('postImageUrl').value.trim();
    
    // Se tiver arquivo selecionado, usar base64
    const fileInput = document.getElementById('postImageFile');
    if (fileInput.files.length > 0 && !imageUrl) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            imageUrl = e.target.result;
            await savePost(title, description, imageUrl);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        await savePost(title, description, imageUrl);
    }
}

async function savePost(title, description, imageUrl) {
    try {
        const postData = {
            title: title,
            description: description,
            image_url: imageUrl || '',
            author_email: currentUser.email,
            author_type: currentUser.type,
            likes: 0,
            dislikes: 0,
            created_at: new Date().toISOString()
        };
        
        const response = await fetch('tables/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
        });
        
        if (response.ok) {
            alert('✅ Post criado com sucesso!');
            toggleCreatePost();
            loadPosts();
        } else {
            throw new Error('Erro ao criar post');
        }
    } catch (error) {
        console.error('Erro ao criar post:', error);
        alert('❌ Erro ao criar post. Tente novamente.');
    }
}

async function loadPosts() {
    const container = document.getElementById('postsContainer');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando postagens...</div>';
    
    try {
        const response = await fetch('tables/posts?limit=100&sort=-created_at');
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            const posts = data.data;
            container.innerHTML = '';
            
            for (const post of posts) {
                const postElement = await createPostElement(post);
                container.appendChild(postElement);
            }
        } else {
            container.innerHTML = `
                <div class="no-posts">
                    <i class="fas fa-leaf"></i>
                    <p>Nenhuma postagem ainda. ${currentUser.type === 'developer' ? 'Seja o primeiro a compartilhar algo!' : 'Aguarde novas postagens.'}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro ao carregar posts:', error);
        container.innerHTML = '<div class="loading">❌ Erro ao carregar postagens.</div>';
    }
}

async function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'post-card';
    div.dataset.postId = post.id;
    
    // Verificar reações do usuário
    const userReaction = await getUserReaction('post', post.id);
    
    // Contar comentários
    const commentsCount = await getCommentsCount(post.id);
    
    const date = new Date(post.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const deleteButton = currentUser.type === 'developer' 
        ? `<button class="btn post-delete-btn" onclick="deletePost('${post.id}')"><i class="fas fa-trash"></i> Excluir</button>` 
        : '';
    
    const imageHtml = post.image_url 
        ? `<img src="${post.image_url}" alt="${post.title}" class="post-image">` 
        : '';
    
    const likeActive = userReaction === 'like' ? 'active' : '';
    const dislikeActive = userReaction === 'dislike' ? 'active' : '';
    
    div.innerHTML = `
        <div class="post-header">
            <div class="post-author">
                <div class="post-author-name">
                    <i class="fas fa-user-tie"></i>
                    ${post.author_email}
                </div>
                <div class="post-date">${date}</div>
            </div>
            ${deleteButton}
        </div>
        <div class="post-body">
            <h2 class="post-title">${escapeHtml(post.title)}</h2>
            <p class="post-description">${escapeHtml(post.description)}</p>
            ${imageHtml}
        </div>
        <div class="post-actions">
            <button class="action-btn like-btn ${likeActive}" onclick="toggleReaction('post', '${post.id}', 'like')">
                <i class="fas fa-thumbs-up"></i>
                <span class="action-count">${post.likes || 0}</span>
            </button>
            <button class="action-btn dislike-btn ${dislikeActive}" onclick="toggleReaction('post', '${post.id}', 'dislike')">
                <i class="fas fa-thumbs-down"></i>
                <span class="action-count">${post.dislikes || 0}</span>
            </button>
            <button class="action-btn comment-btn" onclick="openCommentsModal('${post.id}', '${post.author_email}')">
                <i class="fas fa-comments"></i>
                <span class="action-count">${commentsCount}</span>
            </button>
        </div>
    `;
    
    return div;
}

async function deletePost(postId) {
    if (currentUser.type !== 'developer') {
        alert('❌ Apenas desenvolvedores e professores podem excluir posts!');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir esta postagem?')) {
        return;
    }
    
    try {
        // Deletar comentários do post
        const commentsResponse = await fetch(`tables/comments?limit=1000`);
        const commentsData = await commentsResponse.json();
        const postComments = commentsData.data.filter(c => c.post_id === postId);
        
        for (const comment of postComments) {
            await fetch(`tables/comments/${comment.id}`, { method: 'DELETE' });
        }
        
        // Deletar reações do post
        const reactionsResponse = await fetch(`tables/post_reactions?limit=1000`);
        const reactionsData = await reactionsResponse.json();
        const postReactions = reactionsData.data.filter(r => r.post_id === postId);
        
        for (const reaction of postReactions) {
            await fetch(`tables/post_reactions/${reaction.id}`, { method: 'DELETE' });
        }
        
        // Deletar post
        await fetch(`tables/posts/${postId}`, { method: 'DELETE' });
        
        alert('✅ Post excluído com sucesso!');
        loadPosts();
    } catch (error) {
        console.error('Erro ao deletar post:', error);
        alert('❌ Erro ao deletar post. Tente novamente.');
    }
}

// === FUNÇÕES DE REAÇÃO (CURTIR/NÃO CURTIR) ===
async function getUserReaction(type, itemId) {
    try {
        const table = type === 'post' ? 'post_reactions' : 'comment_reactions';
        const field = type === 'post' ? 'post_id' : 'comment_id';
        
        const response = await fetch(`tables/${table}?limit=1000`);
        const data = await response.json();
        
        const reaction = data.data.find(r => 
            r[field] === itemId && r.user_email === currentUser.email
        );
        
        return reaction ? reaction.reaction_type : null;
    } catch (error) {
        console.error('Erro ao buscar reação:', error);
        return null;
    }
}

async function toggleReaction(type, itemId, reactionType) {
    try {
        const table = type === 'post' ? 'post_reactions' : 'comment_reactions';
        const itemTable = type === 'post' ? 'posts' : 'comments';
        const field = type === 'post' ? 'post_id' : 'comment_id';
        
        // Buscar reação existente
        const response = await fetch(`tables/${table}?limit=1000`);
        const data = await response.json();
        
        const existingReaction = data.data.find(r => 
            r[field] === itemId && r.user_email === currentUser.email
        );
        
        // Buscar item atual para atualizar contadores
        const itemResponse = await fetch(`tables/${itemTable}/${itemId}`);
        const item = await itemResponse.json();
        
        let newLikes = item.likes || 0;
        let newDislikes = item.dislikes || 0;
        
        if (existingReaction) {
            // Se já tinha reação
            if (existingReaction.reaction_type === reactionType) {
                // Remover reação
                await fetch(`tables/${table}/${existingReaction.id}`, { method: 'DELETE' });
                if (reactionType === 'like') {
                    newLikes = Math.max(0, newLikes - 1);
                } else {
                    newDislikes = Math.max(0, newDislikes - 1);
                }
            } else {
                // Mudar reação
                await fetch(`tables/${table}/${existingReaction.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reaction_type: reactionType })
                });
                if (reactionType === 'like') {
                    newLikes++;
                    newDislikes = Math.max(0, newDislikes - 1);
                } else {
                    newDislikes++;
                    newLikes = Math.max(0, newLikes - 1);
                }
            }
        } else {
            // Adicionar nova reação
            const reactionData = {
                [field]: itemId,
                user_email: currentUser.email,
                reaction_type: reactionType
            };
            await fetch(`tables/${table}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reactionData)
            });
            if (reactionType === 'like') {
                newLikes++;
            } else {
                newDislikes++;
            }
        }
        
        // Atualizar contadores no item
        await fetch(`tables/${itemTable}/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ likes: newLikes, dislikes: newDislikes })
        });
        
        // Atualizar UI
        if (type === 'post') {
            loadPosts();
        } else {
            loadComments(currentPostId, getCurrentPostAuthor());
        }
    } catch (error) {
        console.error('Erro ao processar reação:', error);
        alert('❌ Erro ao processar reação. Tente novamente.');
    }
}

// === FUNÇÕES DE COMENTÁRIOS ===
function getCurrentPostAuthor() {
    const modal = document.getElementById('commentsModal');
    return modal.dataset.postAuthor || '';
}

async function getCommentsCount(postId) {
    try {
        const response = await fetch(`tables/comments?limit=1000`);
        const data = await response.json();
        const comments = data.data.filter(c => c.post_id === postId);
        return comments.length;
    } catch (error) {
        console.error('Erro ao contar comentários:', error);
        return 0;
    }
}

async function openCommentsModal(postId, postAuthor) {
    currentPostId = postId;
    const modal = document.getElementById('commentsModal');
    modal.dataset.postAuthor = postAuthor;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    await loadComments(postId, postAuthor);
}

function closeCommentsModal() {
    const modal = document.getElementById('commentsModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentPostId = null;
    document.getElementById('commentText').value = '';
}

async function loadComments(postId, postAuthor) {
    const container = document.getElementById('commentsContainer');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando comentários...</div>';
    
    try {
        const response = await fetch(`tables/comments?limit=1000`);
        const data = await response.json();
        
        const comments = data.data.filter(c => c.post_id === postId);
        comments.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        
        if (comments.length > 0) {
            container.innerHTML = '';
            
            for (const comment of comments) {
                const commentElement = await createCommentElement(comment, postAuthor);
                container.appendChild(commentElement);
            }
        } else {
            container.innerHTML = `
                <div class="no-posts">
                    <i class="fas fa-comment"></i>
                    <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro ao carregar comentários:', error);
        container.innerHTML = '<div class="loading">❌ Erro ao carregar comentários.</div>';
    }
}

async function createCommentElement(comment, postAuthor) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.dataset.commentId = comment.id;
    
    const userReaction = await getUserReaction('comment', comment.id);
    const likeActive = userReaction === 'like' ? 'active' : '';
    const dislikeActive = userReaction === 'dislike' ? 'active' : '';
    
    const date = new Date(comment.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const isCreator = comment.author_email === postAuthor;
    const creatorBadge = isCreator 
        ? '<span class="creator-badge"><i class="fas fa-flag"></i> Criador</span>' 
        : '';
    
    const deleteButton = currentUser.type === 'developer' 
        ? `<button class="comment-delete-btn" onclick="deleteComment('${comment.id}')"><i class="fas fa-trash"></i></button>` 
        : '';
    
    div.innerHTML = `
        <div class="comment-header">
            <div class="comment-author">
                <div class="comment-author-name">
                    ${comment.author_email}
                    ${creatorBadge}
                </div>
                <div class="comment-date">${date}</div>
            </div>
            ${deleteButton}
        </div>
        <p class="comment-text">${escapeHtml(comment.comment_text)}</p>
        <div class="comment-actions">
            <button class="comment-action-btn like ${likeActive}" onclick="toggleReaction('comment', '${comment.id}', 'like')">
                <i class="fas fa-thumbs-up"></i>
                <span>${comment.likes || 0}</span>
            </button>
            <button class="comment-action-btn dislike ${dislikeActive}" onclick="toggleReaction('comment', '${comment.id}', 'dislike')">
                <i class="fas fa-thumbs-down"></i>
                <span>${comment.dislikes || 0}</span>
            </button>
        </div>
    `;
    
    return div;
}

async function addComment(event) {
    event.preventDefault();
    
    if (!currentPostId) {
        alert('❌ Erro ao identificar o post.');
        return;
    }
    
    const commentText = document.getElementById('commentText').value.trim();
    
    if (!commentText) {
        alert('❌ Por favor, digite um comentário.');
        return;
    }
    
    try {
        const postAuthor = getCurrentPostAuthor();
        
        const commentData = {
            post_id: currentPostId,
            comment_text: commentText,
            author_email: currentUser.email,
            author_type: currentUser.type,
            is_creator: currentUser.email === postAuthor,
            likes: 0,
            dislikes: 0,
            created_at: new Date().toISOString()
        };
        
        const response = await fetch('tables/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commentData)
        });
        
        if (response.ok) {
            document.getElementById('commentText').value = '';
            await loadComments(currentPostId, postAuthor);
            
            // Atualizar contador de comentários no post
            loadPosts();
        } else {
            throw new Error('Erro ao criar comentário');
        }
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        alert('❌ Erro ao adicionar comentário. Tente novamente.');
    }
}

async function deleteComment(commentId) {
    if (currentUser.type !== 'developer') {
        alert('❌ Apenas desenvolvedores e professores podem excluir comentários!');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este comentário?')) {
        return;
    }
    
    try {
        // Deletar reações do comentário
        const reactionsResponse = await fetch(`tables/comment_reactions?limit=1000`);
        const reactionsData = await reactionsResponse.json();
        const commentReactions = reactionsData.data.filter(r => r.comment_id === commentId);
        
        for (const reaction of commentReactions) {
            await fetch(`tables/comment_reactions/${reaction.id}`, { method: 'DELETE' });
        }
        
        // Deletar comentário
        await fetch(`tables/comments/${commentId}`, { method: 'DELETE' });
        
        await loadComments(currentPostId, getCurrentPostAuthor());
        loadPosts(); // Atualizar contador
    } catch (error) {
        console.error('Erro ao deletar comentário:', error);
        alert('❌ Erro ao deletar comentário. Tente novamente.');
    }
}

// === FUNÇÕES AUXILIARES ===
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fechar modal ao clicar fora
document.getElementById('commentsModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeCommentsModal();
    }
});
