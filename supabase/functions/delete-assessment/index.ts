import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { babyId, adminDelete } = await req.json();

    if (!babyId) {
      return new Response(
        JSON.stringify({ error: 'baby_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting deletion for baby_id:', babyId, 'adminDelete:', adminDelete);

    // Create Supabase client with SERVICE_ROLE_KEY to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // If adminDelete flag is set, skip user authentication (for analytics page)
    // Otherwise, require user authentication and ownership verification
    if (!adminDelete) {
      // SECURITY: Verify the authenticated user owns this baby
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        console.error('No authorization header provided');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the authenticated user from the JWT token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        console.error('Failed to authenticate user:', authError);
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the baby exists and belongs to the authenticated user
      const { data: baby, error: babyCheckError } = await supabaseAdmin
        .from('babies')
        .select('user_id')
        .eq('id', babyId)
        .single();

      if (babyCheckError || !baby) {
        console.error('Baby not found:', babyCheckError);
        return new Response(
          JSON.stringify({ error: 'Baby not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check ownership - user must own this baby
      if (baby.user_id !== user.id) {
        console.error('User does not own this baby. User:', user.id, 'Baby owner:', baby.user_id);
        return new Response(
          JSON.stringify({ error: 'Forbidden: You do not have permission to delete this baby' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Ownership verified. User', user.id, 'owns baby', babyId);
    } else {
      console.log('Admin delete mode - skipping ownership verification');
      
      // Verify baby exists
      const { data: baby, error: babyCheckError } = await supabaseAdmin
        .from('babies')
        .select('id')
        .eq('id', babyId)
        .single();

      if (babyCheckError || !baby) {
        console.error('Baby not found:', babyCheckError);
        return new Response(
          JSON.stringify({ error: 'Baby not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get all assessments for this baby
    const { data: assessments, error: assessmentsError } = await supabaseAdmin
      .from('assessments')
      .select('id')
      .eq('baby_id', babyId);

    if (assessmentsError) {
      console.error('Error fetching assessments:', assessmentsError);
      throw assessmentsError;
    }

    console.log('Found assessments:', assessments?.length || 0);

    // Delete in cascading order
    // 1. Delete assessment_events
    const { error: eventsError } = await supabaseAdmin
      .from('assessment_events')
      .delete()
      .eq('baby_id', babyId);

    if (eventsError) {
      console.error('Error deleting events:', eventsError);
      throw eventsError;
    }
    console.log('Deleted assessment_events');

    // 2. Delete assessment_responses for all assessments
    if (assessments && assessments.length > 0) {
      const assessmentIds = assessments.map(a => a.id);
      const { error: responsesError } = await supabaseAdmin
        .from('assessment_responses')
        .delete()
        .in('assessment_id', assessmentIds);

      if (responsesError) {
        console.error('Error deleting responses:', responsesError);
        throw responsesError;
      }
      console.log('Deleted assessment_responses');
    }

    // 3. Delete assessments
    const { error: deleteAssessmentsError } = await supabaseAdmin
      .from('assessments')
      .delete()
      .eq('baby_id', babyId);

    if (deleteAssessmentsError) {
      console.error('Error deleting assessments:', deleteAssessmentsError);
      throw deleteAssessmentsError;
    }
    console.log('Deleted assessments');

    // 4. Delete milestone_updates if any
    const { error: milestonesError } = await supabaseAdmin
      .from('milestone_updates')
      .delete()
      .eq('baby_id', babyId);

    if (milestonesError) {
      console.error('Error deleting milestone_updates:', milestonesError);
      // Don't throw here, continue with baby deletion
    }
    console.log('Deleted milestone_updates');

    // 5. Finally, delete the baby
    const { error: babyError } = await supabaseAdmin
      .from('babies')
      .delete()
      .eq('id', babyId);

    if (babyError) {
      console.error('Error deleting baby:', babyError);
      throw babyError;
    }
    console.log('Deleted baby');

    return new Response(
      JSON.stringify({ success: true, message: 'Assessment deleted successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-assessment function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
