import { supabase } from './src/lib/supabase';

async function checkColumns() {
  try {
    const { data, error } = await supabase
      .from('furniture')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Diagnostic Error:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('--- FURNITURE TABLE COLUMNS ---');
      console.log(Object.keys(data[0]));
      console.log('--- DATA SAMPLE ---');
      console.log(data[0]);
    } else {
      console.log('Table is empty, trying to get columns from another way...');
      // If table is empty, we can try to insert a dummy row or just use an empty select
      const { data: emptyData } = await supabase.from('furniture').select('*').limit(0);
      console.log('Columns (empty select):', emptyData);
    }
  } catch (err) {
    console.error('Unexpected Error:', err);
  }
}

checkColumns();
