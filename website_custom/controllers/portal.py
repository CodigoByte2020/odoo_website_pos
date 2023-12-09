from odoo.addons.portal.controllers.portal import CustomerPortal, pager
from odoo.http import request

from odoo import http


class AppWebCustomerPortal(CustomerPortal):

    # def _prepare_portal_layout_values(self):
    #     values = super(AppWebCustomerPortal, self)._prepare_portal_layout_values()
    #     print(f'_prepare_portal_layout_values: {values}')
    #     counters = self._prepare_home_portal_values(counters=None)
    #     return values

    def _prepare_home_portal_values(self, counters):
        values = super(AppWebCustomerPortal, self)._prepare_home_portal_values(counters)
        print(f'_prepare_portal_layout_values: {values}')
        values['users_quantity'] = request.env['res.users'].search_count([])
        print(f'_prepare_portal_layout_values: {values}')
        return values

    # Especifica las rutas que la función manejará.
    # En este caso, la función manejará las solicitudes para las rutas /users y /users/page/<int:page>.
    # El segmento <int:pag> indica que se espera un entero en la posición page en la segunda ruta.
    @http.route(['/users', '/users/page/<int:page>'], type='http', website=True)
    # El parámetro page de la función almacena el argumento page de la ruta, sino definimos este parámetro,
    # el argumento de la ruta se guarda en **kwargs.
    # El argumento de la ruta y el parámetro de la función deben tener el mismo nombre.
    def users_list_view(self, page=1, sortby=None, search=None, search_in='all', **kwargs):
        print('HERE')
        step = 3
        model_res_users = request.env['res.users']
        user_quantity = model_res_users.search_count([])
        searchbar_sortings = {
            'id': {'label': 'ID', 'order': 'id asc'},
            'login': {'label': 'LOGIN', 'order': 'login'}
        }
        # search = sobre que campo que queremos buscar
        # search_in =  que filtro de busqueda se esta usando
        searchbar_inputs = {
            'all': {'label': 'Todos', 'input': 'all', 'domain': []},
            'id': {'label': 'Por ID', 'input': 'id', 'domain': [('id', 'ilike', search)]},
            'login': {'label': 'Por login', 'input': 'login', 'domain': [('login', 'ilike', search)]}
        }
        searchbar_domain = searchbar_inputs[search_in]['domain']

        if not sortby:
            sortby = 'id'
        order = searchbar_sortings[sortby]['order']
        page_detail = pager(
            url='/users',
            total=user_quantity,
            page=page,
            step=step,
            url_args={'sortby': sortby, 'search_in': search_in, 'search': search}
        )
        users = model_res_users.search(searchbar_domain, order=order, limit=step, offset=page_detail['offset'])
        values = {
            'users': users,
            'page_name': 'users_list_view',
            'pager': page_detail,
            'sortby': sortby,
            'searchbar_sortings': searchbar_sortings,
            'searchbar_inputs': searchbar_inputs,
            'search': search,
            'search_in': search_in
        }
        return request.render('website_custom.users_list_view', values)

    # @http.route(['/users/<int:user_id>'], type='http', website=True)
    @http.route('/users/<model("res.users"):user>', type='http', website=True)
    def users_form_view(self, user, **kwargs):
        # user = request.env['res.users'].sudo().browse(user_id) Si recibimos <int:user_id> debemos buscar el usuario.
        user_ids = request.env['res.users'].search([]).ids
        user_index = user_ids.index(user.id)
        # Tener cuidado al mandar el id incorrecto a la siguiente llamada del controlador.
        values = {
            'user': user,
            'page_name': 'users_form_view',
            'prev_record': user_index != 0 and f'/users/{user_ids[user_index - 1]}',
            'next_record': user_index < len(user_ids) - 1 and f'/users/{user_ids[user_index + 1]}'
        }
        return request.render('website_custom.users_form_view', values)

    @http.route(['/users/all', '/users/list/<user_ids>'], type='http', website=True, auth='public')
    def users_prueba(self, **kwargs):
        # return '''<h1>Plantilla de prueba</h1>'''
        users = request.env['res.users'].sudo().search([])
        return request.render('website_custom.prueba_template', {'users': users})
