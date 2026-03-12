import { describe, it, expect } from 'vitest';
import { criarResultadoPaginado, apiOk, apiErro } from '../dtos/common.dto';

describe('criarResultadoPaginado', () => {
    it('calcula totalPaginas corretamente', () => {
        expect(criarResultadoPaginado([], 1, 10, 25).totalPaginas).toBe(3);
    });

    it('temProxima = true quando não está na última página', () => {
        const r = criarResultadoPaginado([], 1, 10, 25);
        expect(r.temProxima).toBe(true);
        expect(r.temAnterior).toBe(false);
    });

    it('temAnterior = true na última página', () => {
        const r = criarResultadoPaginado([], 3, 10, 25);
        expect(r.temProxima).toBe(false);
        expect(r.temAnterior).toBe(true);
    });

    it('página única: ambos false', () => {
        const r = criarResultadoPaginado(['a'], 1, 10, 5);
        expect(r.temProxima).toBe(false);
        expect(r.temAnterior).toBe(false);
    });

    it('total = 0 resulta em totalPaginas = 0', () => {
        expect(criarResultadoPaginado([], 1, 10, 0).totalPaginas).toBe(0);
    });

    it('preserva dados e parâmetros de paginação', () => {
        const dados = [{ id: 1 }, { id: 2 }];
        const r = criarResultadoPaginado(dados, 2, 10, 50);
        expect(r.dados).toBe(dados);
        expect(r.pagina).toBe(2);
        expect(r.tamanhoPagina).toBe(10);
        expect(r.total).toBe(50);
    });
});

describe('apiOk', () => {
    it('retorna sucesso = true com dados', () => {
        const r = apiOk({ id: 1 });
        expect(r.sucesso).toBe(true);
        expect(r.dados).toEqual({ id: 1 });
    });

    it('inclui mensagem opcional', () => {
        expect(apiOk(null, 'Criado').mensagem).toBe('Criado');
    });
});

describe('apiErro', () => {
    it('retorna sucesso = false', () => {
        expect(apiErro('Erro').sucesso).toBe(false);
    });

    it('inclui array de erros quando fornecido', () => {
        expect(apiErro('Inválido', ['campo obrigatório']).erros).toEqual(['campo obrigatório']);
    });
});
