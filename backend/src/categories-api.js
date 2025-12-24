// Categories API - CRUD operations for user-defined categories

export function setupCategoriesAPI(app, supabase) {

  /* ========================================
     Get All Categories
     ======================================== */
  app.get('/api/categories', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('id');

      if (error) throw error;

      res.json({ success: true, categories: data || [] });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /* ========================================
     Create Category
     ======================================== */
  app.post('/api/categories', async (req, res) => {
    try {
      const { name, color } = req.body;

      if (!name || !color) {
        return res.status(400).json({
          success: false,
          error: 'Name and color are required'
        });
      }

      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, color }])
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, category: data });
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /* ========================================
     Update Category
     ======================================== */
  app.patch('/api/categories/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, category: data });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /* ========================================
     Delete Category
     ======================================== */
  app.delete('/api/categories/:id', async (req, res) => {
    try {
      const { id } = req.params;

      // Check if category is in use
      const { data: eventsWithCategory, error: checkError } = await supabase
        .from('events')
        .select('id')
        .eq('category_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (eventsWithCategory && eventsWithCategory.length > 0) {
        return res.status(400).json({
          success: false,
          error: '이 카테고리를 사용하는 이벤트가 있어 삭제할 수 없습니다.'
        });
      }

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
}
